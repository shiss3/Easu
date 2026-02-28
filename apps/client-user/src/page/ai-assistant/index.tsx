import { useState, useRef, useEffect, useCallback, lazy, Suspense, memo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Send from 'lucide-react/dist/esm/icons/send';
import Square from 'lucide-react/dist/esm/icons/square';
import Star from 'lucide-react/dist/esm/icons/star';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Brain from 'lucide-react/dist/esm/icons/brain';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import MessageSquarePlus from 'lucide-react/dist/esm/icons/message-square-plus';
import History from 'lucide-react/dist/esm/icons/history';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import type { HotelVo } from '@/services/hotel-search';
import {
    useAiChatStore,
    safeGenerateId,
    type ChatMessage,
    type ChatMode,
    type ProcessStep,
} from '@/store/aiChatStore';

const ModelSelectorModal = lazy(() => import('@/components/Ai/ModelSelectorModal.tsx'));
const HistoryDrawer = lazy(() => import('@/components/Ai/HistoryDrawer.tsx'));

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const QUICK_TAGS = ['南京电竞酒店', '上海情侣入住', '北京能寄存行李的酒店'];

const MODE_LABELS: Record<ChatMode, string> = {
    chat: '智能搜索',
    reasoner: '深度思考',
};

const scrollPositionCache = new Map<string, number>();

const AIAssistantPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoSentRef = useRef(false);
    const isGeneratingRef = useRef(false);

    const activeSessionId = useAiChatStore(state => state.activeSessionId);
    const messageIds = useAiChatStore(
        useShallow(state => {
            const session = state.sessions[state.activeSessionId];
            return session ? session.messages.map(m => m.id) : [];
        })
    );
    const addMessage = useAiChatStore(state => state.addMessage);
    const validateSession = useAiChatStore(state => state.validateSession);
    const chatMode = useAiChatStore(state => state.chatMode);
    const setChatMode = useAiChatStore(state => state.setChatMode);

    const isEmpty = messageIds.length === 0;

    useEffect(() => {
        isGeneratingRef.current = isGenerating;
    }, [isGenerating]);

    useEffect(() => {
        validateSession();
    }, [validateSession]);

    useEffect(() => {
        const cached = scrollPositionCache.get(activeSessionId);
        if (cached != null && scrollContainerRef.current) {
            requestAnimationFrame(() => {
                scrollContainerRef.current!.scrollTop = cached;
            });
        }

        return () => {
            if (scrollContainerRef.current) {
                scrollPositionCache.set(activeSessionId, scrollContainerRef.current.scrollTop);
            }
        };
    }, [activeSessionId]);

    useEffect(() => {
        return useAiChatStore.subscribe((state, prevState) => {
            if (!isGeneratingRef.current) return;
            const updatedAt = state.sessions[state.activeSessionId]?.updatedAt;
            const prevUpdatedAt = prevState.sessions[prevState.activeSessionId]?.updatedAt;
            if (updatedAt !== prevUpdatedAt || state.activeSessionId !== prevState.activeSessionId) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }, []);

    useEffect(() => {
        return () => { abortControllerRef.current?.abort(); };
    }, []);

    const sendMessage = useCallback(async (payload?: string | React.SyntheticEvent) => {
        const text = (typeof payload === 'string' ? payload : inputValue).trim();
        if (!text || isGenerating) return;

        const userMsg: ChatMessage = { id: safeGenerateId(), role: 'user', content: text };
        const assistantId = safeGenerateId();
        const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' };

        addMessage(userMsg);
        addMessage(assistantMsg);
        setInputValue('');
        setIsGenerating(true);

        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;

        const currentStoreMessages = useAiChatStore.getState().sessions[activeSessionId]?.messages ?? [];
        const payloadMessages = currentStoreMessages
            .filter(m => m.content)
            .map(m => ({ role: m.role, content: m.content }));

        try {
            await fetchEventSource(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: payloadMessages, model: chatMode }),
                signal: ctrl.signal,
                openWhenHidden: true,

                onmessage(ev) {
                    let data: Record<string, unknown>;
                    try { data = JSON.parse(ev.data); } catch { return; }

                    const append = useAiChatStore.getState().appendAssistantContent;

                    if (ev.event === 'delta') {
                        if (data.type === 'reasoning') {
                            append(assistantId, { reasoning: data.text as string });
                        } else {
                            append(assistantId, { content: data.text as string });
                        }
                    } else if (ev.event === 'structured_reasoning_step') {
                        append(assistantId, {
                            structuredReasoningStep: data.text as string,
                        });
                    } else if (ev.event === 'process_step') {
                        append(assistantId, {
                            processStep: data as unknown as ProcessStep,
                        });
                    } else if (ev.event === 'tool_data') {
                        append(assistantId, { hotels: data.hotels as HotelVo[] });
                    } else if (ev.event === 'error') {
                        const current = useAiChatStore.getState().sessions[activeSessionId]?.messages
                            .find(m => m.id === assistantId);
                        if (!current?.content) {
                            append(assistantId, { content: (data.message as string) || '抱歉，出了点问题' });
                        }
                    }
                },
                onclose() { setIsGenerating(false); },
                onerror(err) {
                    setIsGenerating(false);
                    if (ctrl.signal.aborted) throw err;
                },
            });
        } catch {
            if (!ctrl.signal.aborted) {
                const current = useAiChatStore.getState().sessions[activeSessionId]?.messages
                    .find(m => m.id === assistantId);
                if (!current?.content) {
                    useAiChatStore.getState().appendAssistantContent(assistantId, {
                        content: '网络连接异常，请稍后重试。',
                    });
                }
            }
        } finally {
            setIsGenerating(false);
        }
    }, [inputValue, isGenerating, activeSessionId, addMessage, chatMode]);

    useEffect(() => {
        const promptFromUrl = searchParams.get('prompt');
        if (promptFromUrl && !autoSentRef.current) {
            const timer = setTimeout(() => {
                autoSentRef.current = true;
                sendMessage(promptFromUrl);
                navigate(location.pathname, { replace: true });
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [searchParams, location.pathname, navigate, sendMessage]);

    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsGenerating(false);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    return (
        <div className="flex flex-col h-screen bg-white relative">
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/80 to-white pointer-events-none" />

            {/* Header */}
            <div className="flex items-center px-4 py-3 z-10 shrink-0">
                <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800">
                    <ChevronLeft size={28} />
                </button>
                <span className="ml-2 font-semibold text-slate-800">小宿 AI </span>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={() => useAiChatStore.getState().createNewSession()}
                        className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <MessageSquarePlus size={22} />
                    </button>
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <History size={22} />
                    </button>
                </div>
            </div>

            {/* Messages / Empty State */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-44 z-10">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Sparkles size={40} className="text-blue-500/60 mb-4" />
                        <h2 className="font-bold text-2xl mb-8 text-gray-900">
                            用<span className="text-blue-600">小宿</span>让旅程有处可栖
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2">
                            {QUICK_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => sendMessage(tag)}
                                    className="bg-gray-100 text-black px-4 py-2 rounded-full text-sm hover:bg-blue-100 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messageIds.map(id => (
                            <SmartMessageItem
                                key={id}
                                id={id}
                                activeSessionId={activeSessionId}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20">
                <div className="rounded-2xl border border-gray-300 bg-white px-3 py-3 shadow-sm">
                    <div className="flex gap-3 mb-2 overflow-x-auto">
                        <button
                            onClick={() => setIsModelOpen(true)}
                            className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                            <span>{MODE_LABELS[chatMode]}</span>
                            <ChevronDown size={12} />
                        </button>
                    </div>
                    <div className="relative flex items-center gap-2">
                        <input
                            className="flex-1 h-11 bg-white rounded-full px-5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-200 transition-shadow"
                            placeholder="任何旅游相关问题都可以问我哦"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isGenerating}
                        />
                        {isGenerating ? (
                            <button
                                onClick={handleStop}
                                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm active:scale-95 transition-transform"
                            >
                                <Square size={16} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                onClick={() => sendMessage()}
                                disabled={!inputValue.trim()}
                                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm disabled:opacity-40 active:scale-95 transition-transform"
                            >
                                <Send size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lazy-loaded overlays */}
            <Suspense fallback={null}>
                {isModelOpen && (
                    <ModelSelectorModal
                        isOpen={isModelOpen}
                        onClose={() => setIsModelOpen(false)}
                        currentMode={chatMode}
                        onSelect={setChatMode}
                    />
                )}
                {isHistoryOpen && (
                    <HistoryDrawer
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                    />
                )}
            </Suspense>
        </div>
    );
};

/* ── Smart Message Item (memo'd, self-subscribing) ───────────────────── */

const SmartMessageItem = memo(({ id, activeSessionId }: { id: string; activeSessionId: string }) => {
    const navigate = useNavigate();
    const msg = useAiChatStore(state => {
        const session = state.sessions[activeSessionId];
        return session?.messages.find(m => m.id === id);
    });

    if (!msg) return null;

    return (
        <div className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
                <div className="max-w-[80%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap shadow-sm">
                    {msg.content}
                </div>
            ) : (
                <div className="max-w-[90%] space-y-2">
                    <StructuredReasoningBlock steps={msg.structuredReasoning} />
                    <ProcessStepsList steps={msg.processSteps} />
                    {msg.content && (
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-800 whitespace-pre-wrap shadow-sm leading-relaxed border border-slate-100">
                            {renderInterlacedContent(msg.content, msg.hotels, navigate)}
                        </div>
                    )}
                    {!msg.content && !msg.processSteps?.length && !msg.hotels?.length && !msg.structuredReasoning?.length && (
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100">
                            <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
SmartMessageItem.displayName = 'SmartMessageItem';

/* ── Sub-components ──────────────────────────────────────────────────── */

const StructuredReasoningBlock = memo(({ steps }: { steps?: string[] }) => {
    const [expanded, setExpanded] = useState(true);

    if (!steps || steps.length === 0) return null;

    return (
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-600 border border-slate-200/60">
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 font-medium text-slate-500 w-full"
            >
                <Brain size={12} className="text-blue-500" />
                <span>思考过程</span>
                <ChevronDown size={14} className={`ml-auto transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <ul className="mt-2 space-y-1.5 pl-0.5">
                    {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                            <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-semibold mt-0.5">
                                {i + 1}
                            </span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});
StructuredReasoningBlock.displayName = 'StructuredReasoningBlock';

const ProcessStepsList = memo(({ steps }: { steps?: ProcessStep[] }) => {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="space-y-1.5 py-1">
            {steps.map(step => (
                <div key={step.id} className="flex items-center gap-2 text-xs">
                    {step.status === 'loading' ? (
                        <Loader2 size={14} className="text-blue-500 animate-spin shrink-0" />
                    ) : (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    )}
                    <span className={step.status === 'loading' ? 'text-blue-600 font-medium' : 'text-slate-500'}>
                        {step.text}
                    </span>
                </div>
            ))}
        </div>
    );
});
ProcessStepsList.displayName = 'ProcessStepsList';

function InlineHotelCard({ hotel, onNavigate }: { hotel: HotelVo; onNavigate: () => void }) {
    return (
        <div
            onClick={onNavigate}
            className="flex gap-3 my-2 bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm cursor-pointer active:scale-[0.98] transition-transform w-full max-w-sm"
        >
            <img
                src={hotel.coverImage || 'https://placehold.co/208x128?text=Hotel'}
                alt={hotel.name}
                className="w-24 h-24 object-cover rounded-lg shrink-0"
                loading="lazy"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                    <h3 className="font-bold text-slate-800 text-sm truncate">{hotel.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium text-amber-500">{hotel.score}</span>
                    </div>
                </div>
                <div className="flex justify-between items-end mt-2">
                    <div className="flex gap-1 overflow-hidden max-w-[60%]">
                        {hotel.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded truncate">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="text-red-500 font-bold text-sm">
                        ¥{hotel.minPrice}<span className="text-[10px] font-normal ml-0.5">起</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function renderInterlacedContent(
    content: string,
    hotels?: HotelVo[],
    navigate?: (path: string) => void,
): React.ReactNode {
    if (!hotels || hotels.length === 0) return content;

    const displayContent = content.replace(/\[[^\]]*$/, '');
    const parts = displayContent.split(/(\[HOTEL_CARD_\d+])/g);

    return parts.map((part, index) => {
        const match = part.match(/\[HOTEL_CARD_(\d+)]/);
        if (match) {
            const hotelId = Number(match[1]);
            const hotel = hotels.find(h => h.id === hotelId);
            if (hotel) {
                return (
                    <InlineHotelCard
                        key={`card-${index}`}
                        hotel={hotel}
                        onNavigate={() => navigate?.(`/hotel/${hotel.id}`)}
                    />
                );
            }
            return null;
        }
        return part ? <span key={`text-${index}`}>{part}</span> : null;
    });
}

export default AIAssistantPage;
