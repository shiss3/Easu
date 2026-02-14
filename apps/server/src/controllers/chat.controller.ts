import { Request, Response } from 'express';
import OpenAI from 'openai';
import { doubaoClient, MODEL_CHAT, MODEL_REASONER } from '../lib/ai';

type ChatInputMessage = {
    role: string;
    content: string;
};

type ChatRequestBody = {
    messages?: ChatInputMessage[];
    model?: 'chat' | 'reasoner';
};

type NormalizedMessage =
    | OpenAI.Chat.Completions.ChatCompletionSystemMessageParam
    | OpenAI.Chat.Completions.ChatCompletionUserMessageParam
    | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;

const SYSTEM_PROMPT = `你是 Easu 酒店预订平台的智能助手，名字叫"小宿"。

你的能力：
1. 帮用户搜索和推荐酒店。当用户提到找酒店、订房、住宿等需求时，优先调用 searchHotels 工具。
2. 回答旅游相关问题（目的地推荐、行程规划等）。
3. 你服务于酒店和旅游领域。

核心策略（必须严格执行）：
1. 主动推荐，拒绝“客服式连环追问”：
- 不要先反问一连串细节再行动。
- 在信息不完整时，先给出可执行的推荐结果，再做补充引导。
2. 默认参数原则：
- searchHotels 的 maxPrice 和 minPrice 单位是"元"。
- 用户未明确预算时，使用宽泛默认价格区间：minPrice=200，maxPrice=3000。
- 当需要更宽泛兜底时，可将 maxPrice 放宽到 5000，确保能返回结果。
3. 先给结果，再引导：
- 永远先提供具体酒店推荐（简要说明推荐理由）。
- 在回复结尾补一句：如果您有具体预算或位置偏好，我可以为您更精准地筛选。
4. 场景化联想：
- 识别用户场景并自动补全偏好关键词，不要求用户显式给出。
- 例如“情侣入住”默认联想：隔音好、氛围感、大床房、浴缸。

重要约束：
- 如果用户没有明确指定城市，不要反复追问阻塞流程；可先基于常见热门区域给出示例推荐，并在结尾补充可按城市精准筛选。
- 展示搜索结果时，简要总结推荐理由即可，不要逐一列出详细信息（详情在卡片中）。

回复风格：
- 使用中文，语气友好亲切。
- 回答简洁，避免过长。
- 适当使用 emoji 增加亲和力。`;

const writeSseEvent = (res: Response, event: string, data: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const postChat = async (req: Request, res: Response) => {
    const body = req.body as ChatRequestBody;
    const modelType = body?.model ?? 'chat';
    const userMessages = Array.isArray(body?.messages) ? body.messages : [];

    if (!userMessages.length) {
        return res.status(400).json({
            code: 400,
            message: 'messages 不能为空',
            data: null,
        });
    }

    req.setTimeout(0);
    res.setTimeout(120000);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const model = modelType === 'reasoner' ? MODEL_REASONER : MODEL_CHAT;
    const normalizedMessages: NormalizedMessage[] = userMessages
        .map((message): NormalizedMessage => {
            const content = typeof message.content === 'string' ? message.content : String(message.content ?? '');

            if (message.role === 'assistant') {
                return { role: 'assistant', content };
            }

            if (message.role === 'system') {
                return { role: 'system', content };
            }

            return { role: 'user', content };
        })
        .filter((message) => message.content.length > 0);

    let aborted = false;

    res.on('close', () => {
        aborted = true;
    });

    try {
        const stream = await doubaoClient.chat.completions.create({
            model,
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT,
                },
                ...normalizedMessages,
            ],
        });

        for await (const chunk of stream) {
            if (aborted) {
                break;
            }

            const delta = chunk.choices?.[0]?.delta as
                | { content?: string; reasoning_content?: string }
                | undefined;

            if (delta?.reasoning_content) {
                writeSseEvent(res, 'delta', {
                    type: 'reasoning',
                    text: delta.reasoning_content,
                });
            }

            if (delta?.content) {
                writeSseEvent(res, 'delta', {
                    type: 'content',
                    text: delta.content,
                });
            }
        }

        if (aborted) {
            stream.controller?.abort();
            return;
        }

        writeSseEvent(res, 'done', {});
        res.end();
    } catch (error) {
        const err = error as { status?: number };
        const status = err.status;
        let message = '服务暂时不可用，请稍后重试';

        if (status === 401) {
            message = 'AI 服务认证失败，请检查服务配置';
        } else if (status === 429) {
            message = '请求过于频繁，请稍后再试';
        }

        if (!aborted) {
            writeSseEvent(res, 'error', { message });
            res.end();
        }
    }
};
