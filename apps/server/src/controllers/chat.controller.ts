import { Request, Response } from 'express';
import OpenAI from 'openai';
import dayjs from 'dayjs';
import { doubaoClient, MODEL_CHAT, MODEL_REASONER } from '../lib/ai';
import { executeHotelSearch, type HotelSearchResult } from './hotel-search.service';

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
    | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
    | OpenAI.Chat.Completions.ChatCompletionToolMessageParam;

const SYSTEM_PROMPT = `你是 Easu 酒店预订平台的智能助手，名字叫"小宿"。

你的能力：
1. 帮用户搜索和推荐酒店。当用户提到找酒店、订房、住宿等需求时，优先调用 search_hotels 工具。
2. 回答旅游相关问题（目的地推荐、行程规划等）。
3. 你服务于酒店和旅游领域。

核心策略（必须严格执行）：
1. 主动推荐，拒绝"客服式连环追问"：
- 不要先反问一连串细节再行动。
- 在信息不完整时，先给出可执行的推荐结果，再做补充引导。
2. 默认参数原则：
- search_hotels 的 maxPrice 和 minPrice 单位是"元"。
- 用户未明确预算时，使用宽泛默认价格区间：minPrice=200，maxPrice=3000。
- 当需要更宽泛兜底时，可将 maxPrice 放宽到 5000，确保能返回结果。
3. 先给结果，再引导：
- 永远先提供具体酒店推荐（简要说明推荐理由），控制字数在 50 字以内。
- 至少推荐2个酒店，不要只推荐一个。
- 由于前端会自动渲染精美的酒店卡片，你的回复必须极度简短（控制在 50 字以内），只需概括推荐理由即可。
- 在回复结尾补一句：如果您有具体预算或位置偏好，我可以为您更精准地筛选。

4. 场景化联想：
- 识别用户场景并自动补全偏好关键词，不要求用户显式给出。
- 关键词按照下面的场景进行分配，如果是在匹配不到至少要包含一个关键词。
- 例如"商务基础"默认联想：免费WIFI, 含早, 免费停车, 24小时前台, 行李寄存, 近地铁。
- 例如"设施进阶"默认联想：健身房, 恒温游泳池, SPA, 会议室, 接机服务, 咖啡厅, 自助洗衣房, 智能客控, 机器人送物。
- 例如"情侣/度假风"默认联想：情侣主题, 带浴缸, 全景落地窗, 海景/江景, 氛围感灯光, 隔音极佳, 私人影院。
- 例如"亲子/家庭"默认联想：儿童乐园, 家庭套房, 提供婴儿床, 亲子活动。
- 例如"电竞/特色"默认联想：高配电脑, 千兆光纤, 电竞椅, 宠物友好。

重要约束：
- 如果用户没有明确指定城市，不要反复追问阻塞流程；可先基于常见热门区域给出示例推荐，并在结尾补充可按城市精准筛选。
- 展示搜索结果时，简要总结推荐理由即可，不要逐一列出详细信息（详情在卡片中）。

回复风格：
- 使用中文，语气友好亲切。
- 回答简洁，避免过长。
- 适当使用 emoji 增加亲和力。`;

const HOTEL_SEARCH_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: 'function',
    function: {
        name: 'search_hotels',
        description: `搜索酒店、查询价格与设施标签。今天是 ${dayjs().format('YYYY-MM-DD')}。当用户提及订房、找酒店、查价格等需求时，必须优先调用此工具。对于相对时间（如明天、下周），必须基于今天推算为准确的 YYYY-MM-DD 日期格式。如果用户没有指定预算，不要猜测，忽略价格字段即可。返回的设施标签必须符合下面的场景化联想。`,
        parameters: {
            type: 'object',
            properties: {
                city: {
                    type: 'string',
                    description: '城市名称，如"杭州"、"上海"。从用户对话中提取。',
                },
                checkIn: {
                    type: 'string',
                    description: '入住日期，格式 YYYY-MM-DD。从用户对话中推算。',
                },
                checkOut: {
                    type: 'string',
                    description: '离店日期，格式 YYYY-MM-DD。从用户对话中推算。',
                },
                keyword: {
                    type: 'string',
                    description: '搜索关键词，用于匹配酒店名称、地标或特色标签。【极度重要】：当用户按场景或设施找酒店时（如情侣、亲子、电竞），你必须将需求翻译为以下已知标签中的一个确切词汇填入，绝对不要填入完整的自然语言短语（错误示范："适合情侣"、"带小孩的"）。已知可用标签库：[\'免费WIFI\', \'含早\', \'免费停车\', \'24小时前台\', \'行李寄存\', \'近地铁\', \'健身房\', \'恒温游泳池\', \'SPA\', \'会议室\', \'接机服务\', \'咖啡厅\', \'自助洗衣房\', \'智能客控\', \'机器人送物\', \'情侣主题\', \'带浴缸\', \'全景落地窗\', \'海景/江景\', \'氛围感灯光\', \'隔音极佳\', \'私人影院\', \'儿童乐园\', \'家庭套房\', \'提供婴儿床\', \'亲子活动\', \'高配电脑\', \'千兆光纤\', \'电竞椅\', \'宠物友好\']。',
                },
                minPrice: {
                    type: 'number',
                    description: '最低价格（元），仅在用户明确提到预算下限时传入。',
                },
                maxPrice: {
                    type: 'number',
                    description: '最高价格（元），仅在用户明确提到预算上限时传入。',
                },
                sort: {
                    type: 'string',
                    enum: ['default', 'rating', 'price_low', 'price_high'],
                    description: '排序方式：default=综合排序, rating=评分最高, price_low=价格从低到高, price_high=价格从高到低。',
                },
                hasWindow: {
                    type: 'boolean',
                    description: '是否需要有窗户的房间。',
                },
                hasBreakfast: {
                    type: 'boolean',
                    description: '是否需要含早餐。',
                },
            },
            required: ['city', 'checkIn', 'checkOut'],
        },
    },
};

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
    const messages: NormalizedMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...userMessages
            .map((message): NormalizedMessage => {
                const content = typeof message.content === 'string' ? message.content : String(message.content ?? '');
                if (message.role === 'assistant') return { role: 'assistant', content };
                if (message.role === 'system') return { role: 'system', content };
                return { role: 'user', content };
            })
            .filter((message) => {
                if (message.role === 'tool') return true;
                return (message.content as string).length > 0;
            }),
    ];

    let aborted = false;
    res.on('close', () => { aborted = true; });

    try {
        // ── First Pass: may produce tool_calls ──────────────────────────
        const firstStream = await doubaoClient.chat.completions.create({
            model,
            stream: true,
            messages,
            tools: [HOTEL_SEARCH_TOOL],
        });

        let toolCallId = '';
        let toolCallName = '';
        let toolCallArgs = '';

        for await (const chunk of firstStream) {
            if (aborted) break;

            const choice = chunk.choices?.[0];
            const delta = choice?.delta as
                | {
                      content?: string;
                      reasoning_content?: string;
                      tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
                  }
                | undefined;

            if (delta?.reasoning_content) {
                writeSseEvent(res, 'delta', { type: 'reasoning', text: delta.reasoning_content });
            }

            if (delta?.content) {
                writeSseEvent(res, 'delta', { type: 'content', text: delta.content });
            }

            if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (tc.id) toolCallId = tc.id;
                    if (tc.function?.name) toolCallName = tc.function.name;
                    if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                }
            }
        }

        if (aborted) {
            firstStream.controller?.abort();
            return;
        }

        // ── Tool Execution ──────────────────────────────────────────────
        if (toolCallName === 'search_hotels') {
            writeSseEvent(res, 'tool_status', { status: 'searching' });

            let toolContent: string;

            try {
                const args = JSON.parse(toolCallArgs);
                const searchResult: HotelSearchResult = await executeHotelSearch(args);

                writeSseEvent(res, 'tool_data', {
                    hotels: [...searchResult.exactMatches, ...searchResult.recommendations],
                });

                toolContent = JSON.stringify(searchResult.aiContext.slice(0, 4));
            } catch (toolErr) {
                console.error('Tool execution failed:', toolErr);
                toolContent = JSON.stringify({ error: '查询失败或参数错误，请告诉用户系统遇到了问题。' });
            }

            messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: toolCallId,
                        type: 'function',
                        function: { name: toolCallName, arguments: toolCallArgs },
                    },
                ],
            });
            messages.push({
                role: 'tool',
                tool_call_id: toolCallId,
                content: toolContent,
            });

            // ── Second Pass: natural-language summary ───────────────────
            const secondStream = await doubaoClient.chat.completions.create({
                model,
                stream: true,
                messages,
            });

            for await (const chunk of secondStream) {
                if (aborted) break;

                const delta = chunk.choices?.[0]?.delta as
                    | { content?: string; reasoning_content?: string }
                    | undefined;

                if (delta?.reasoning_content) {
                    writeSseEvent(res, 'delta', { type: 'reasoning', text: delta.reasoning_content });
                }

                if (delta?.content) {
                    writeSseEvent(res, 'delta', { type: 'content', text: delta.content });
                }
            }

            if (aborted) {
                secondStream.controller?.abort();
                return;
            }
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
