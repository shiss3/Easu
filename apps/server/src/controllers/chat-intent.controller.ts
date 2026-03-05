import { Request, Response } from 'express';
import { doubaoClient, MODEL_CHAT } from '../lib/ai';
import { executeHotelSearch, type HotelSearchResult } from './hotel-search.service';

/* ── Types ────────────────────────────────────────────────────────────── */

interface IntentContext {
    city: string;
    dateRange: { start: string; end: string };
    keyword: string;
    filledFields: string[];
    currentPage: string;
}

interface IntentRequestBody {
    intent?: {
        type?: string;
        context?: Partial<IntentContext>;
    };
}

/* ── Prompt ────────────────────────────────────────────────────────────── */

const INTENT_SUMMARY_PROMPT = `你是 Easu 酒店预订平台的智能助手"小宿"。
当前场景：用户在使用平台时，端侧 AI 识别到用户的搜索意图并主动发起了本次推荐。

你的任务是根据搜索结果生成一段简洁的推荐总结。要求：
1. 生成 2-4 句话的总结性推荐语
2. 不要列出具体酒店名称和详细信息（前端会以列表形式展示）
3. 概括搜索结果的整体情况：数量、价格区间、主要特色
4. 如果结果中包含 isFallback: true 的酒店，说明没有完全匹配的结果，这些是同城优质备选
5. 语气友好亲切，使用中文，可适当使用 emoji`;

/* ── Helpers ──────────────────────────────────────────────────────────── */

const writeSseEvent = (res: Response, event: string, data: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
    }
};

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* ── Controller ──────────────────────────────────────────────────────── */

export const postChatIntent = async (req: Request, res: Response) => {
    const body = req.body as IntentRequestBody;
    const context = body?.intent?.context;

    if (!context?.city && !context?.keyword) {
        return res.status(400).json({
            code: 400,
            message: '意图上下文不能为空',
            data: null,
        });
    }

    req.setTimeout(0);
    res.setTimeout(120_000);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let aborted = false;
    res.on('close', () => { aborted = true; });

    const cityLabel = context.city || '目标城市';
    const keywordLabel = context.keyword || '';

    try {
        // ── Step 1: 结构化推理步骤（直接生成，无需 LLM） ──────────────
        const reasoningSteps = [
            `识别用户意图：正在寻找${cityLabel}的酒店`,
            keywordLabel
                ? `用户关注条件：${keywordLabel}`
                : `分析用户已填写的搜索条件：${context.filledFields?.join('、') || '城市与日期'}`,
            `根据偏好在易宿平台匹配最优酒店`,
            `整合信息并生成个性化推荐`,
        ];

        for (const step of reasoningSteps) {
            if (aborted) return;
            writeSseEvent(res, 'structured_reasoning_step', { text: step });
            await delay(320);
        }

        // ── Step 2: 直接调用搜索服务（跳过 LLM 第一轮） ─────────────
        writeSseEvent(res, 'process_step', {
            id: 'search',
            text: '正在为您检索酒店...',
            status: 'loading',
        });

        const searchResult: HotelSearchResult = await executeHotelSearch({
            city: context.city || undefined,
            checkIn: context.dateRange?.start || undefined,
            checkOut: context.dateRange?.end || undefined,
            keyword: keywordLabel || undefined,
            limit: 10,
        });

        const allHotels = [...searchResult.exactMatches, ...searchResult.recommendations];

        if (aborted) return;

        writeSseEvent(res, 'process_step', {
            id: 'search',
            text: `找到 ${allHotels.length} 家酒店`,
            status: 'success',
        });

        // ── Step 3: 发送完整酒店列表（新事件类型） ──────────────────
        writeSseEvent(res, 'hotel_list', { hotels: allHotels });

        // ── Step 4: LLM 生成推荐总结 ──────────────────────────────────
        writeSseEvent(res, 'process_step', {
            id: 'summary',
            text: '正在生成推荐总结...',
            status: 'loading',
        });

        const hotelSnapshot = allHotels.slice(0, 5).map(h => ({
            price: h.minPrice,
            tags: h.tags?.slice(0, 3),
            score: h.score,
            isFallback: h.isFallback,
        }));

        const userPrompt = [
            `用户意图：在${cityLabel}找酒店${keywordLabel ? `，关注「${keywordLabel}」` : ''}`,
            `入住时间：${context.dateRange?.start || '未指定'} 至 ${context.dateRange?.end || '未指定'}`,
            `搜索结果：共找到 ${allHotels.length} 家酒店`,
            `结果摘要：${JSON.stringify(hotelSnapshot)}`,
            `请生成推荐总结。`,
        ].join('\n');

        const summaryStream = await doubaoClient.chat.completions.create({
            model: MODEL_CHAT,
            stream: true,
            messages: [
                { role: 'system', content: INTENT_SUMMARY_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        });

        let summaryStarted = false;

        for await (const chunk of summaryStream) {
            if (aborted) break;
            const delta = chunk.choices?.[0]?.delta as { content?: string } | undefined;
            if (delta?.content) {
                if (!summaryStarted) {
                    summaryStarted = true;
                    writeSseEvent(res, 'process_step', {
                        id: 'summary',
                        text: '推荐总结已生成',
                        status: 'success',
                    });
                }
                writeSseEvent(res, 'delta', { type: 'content', text: delta.content });
            }
        }

        if (aborted) {
            summaryStream.controller?.abort();
            return;
        }

        writeSseEvent(res, 'done', {});
        res.end();
    } catch (error) {
        console.error('Chat intent SSE error:', error);
        const err = error as { status?: number; message?: string };
        let message = '服务暂时不可用，请稍后重试';

        if (err.status === 429) {
            message = '请求过于频繁，请稍后再试';
        }

        if (!aborted) {
            writeSseEvent(res, 'error', { message });
            res.end();
        }
    }
};
