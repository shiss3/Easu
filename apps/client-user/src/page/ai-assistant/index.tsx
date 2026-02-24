import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Send from 'lucide-react/dist/esm/icons/send';
import Square from 'lucide-react/dist/esm/icons/square';
import Star from 'lucide-react/dist/esm/icons/star';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Brain from 'lucide-react/dist/esm/icons/brain';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import type { HotelVo } from '@/services/hotel-search';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    toolStatus?: string;
    hotels?: HotelVo[];
}

const WELCOME_ID = 'welcome';
const WELCOME_MESSAGE: ChatMessage = {
    id: WELCOME_ID,
    role: 'assistant',
    content: '你好呀！我是小宿 🏨，你的旅行智能助手。\n\n我可以帮你搜酒店、比价格、做攻略。告诉我你想去哪，我来帮你搞定！',
};

const AIAssistantPage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => { abortControllerRef.current?.abort(); };
    }, []);

    const sendMessage = useCallback(async () => {
        const text = inputValue.trim();
        if (!text || isGenerating) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInputValue('');
        setIsGenerating(true);

        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;

        const payloadMessages = [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
        }));

        try {
            await fetchEventSource(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: payloadMessages }),
                signal: ctrl.signal,
                openWhenHidden: true,

                onmessage(ev) {
                    let data: Record<string, unknown>;
                    try { data = JSON.parse(ev.data); } catch { return; }

                    if (ev.event === 'delta') {
                        setMessages(prev => prev.map(msg => {
                            if (msg.id !== assistantId) return msg;
                            if (data.type === 'reasoning') {
                                return { ...msg, reasoning: (msg.reasoning ?? '') + (data.text as string) };
                            }
                            return { ...msg, content: msg.content + (data.text as string) };
                        }));
                    } else if (ev.event === 'tool_status') {
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantId
                                ? { ...msg, toolStatus: '🔍 正在为您检索酒店...' }
                                : msg,
                        ));
                    } else if (ev.event === 'tool_data') {
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantId
                                ? { ...msg, hotels: data.hotels as HotelVo[], toolStatus: '' }
                                : msg,
                        ));
                    } else if (ev.event === 'error') {
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantId
                                ? { ...msg, content: msg.content || (data.message as string) || '抱歉，出了点问题' }
                                : msg,
                        ));
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
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantId && !msg.content
                        ? { ...msg, content: '网络连接异常，请稍后重试。' }
                        : msg,
                ));
            }
        } finally {
            setIsGenerating(false);
        }
    }, [inputValue, isGenerating, messages]);

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
        <div className="flex flex-col h-screen bg-slate-50 relative">
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/80 to-slate-50 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center px-4 py-3 z-10 shrink-0">
                <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800">
                    <ChevronLeft size={28} />
                </button>
                <span className="ml-2 font-semibold text-slate-800">小宿 AI 助手</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pb-44 z-10">
                {messages.map(msg => (
                    <div key={msg.id} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                            <div className="max-w-[80%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap shadow-sm">
                                {msg.content}
                            </div>
                        ) : (
                            <div className="max-w-[90%] space-y-2">
                                <ReasoningBlock reasoning={msg.reasoning} />
                                {msg.toolStatus && <ToolStatusBubble text={msg.toolStatus} />}
                                {msg.content && (
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-800 whitespace-pre-wrap shadow-sm leading-relaxed">
                                        {renderInterlacedContent(msg.content, msg.hotels, navigate)}
                                    </div>
                                )}
                                {!msg.content && !msg.toolStatus && !msg.hotels?.length && !msg.reasoning && (
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
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
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 mb-3 overflow-x-auto px-1">
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100/50">
                        <Brain size={14} />
                        <span>深度思考(R1)</span>
                    </div>
                </div>
                <div className="relative flex items-center gap-2">
                    <input
                        className="flex-1 h-12 bg-slate-100 rounded-full px-5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-200 transition-shadow"
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
                            onClick={sendMessage}
                            disabled={!inputValue.trim()}
                            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm disabled:opacity-40 active:scale-95 transition-transform"
                        >
                            <Send size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Sub-components ──────────────────────────────────────────────────── */

function ReasoningBlock({ reasoning }: { reasoning?: string }) {
    const [expanded, setExpanded] = useState(false);

    if (!reasoning) return null;

    return (
        <div className="bg-slate-100/80 rounded-xl px-3 py-2 text-xs text-slate-500 border border-slate-200/60">
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 font-medium text-slate-500 w-full"
            >
                <Brain size={12} className="text-blue-500" />
                <span>深度思考过程</span>
                <ChevronDown size={14} className={`ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <div className="mt-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {reasoning}
                </div>
            )}
        </div>
    );
}

function ToolStatusBubble({ text }: { text: string }) {
    return (
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-medium">
            <Loader2 size={14} className="animate-spin" />
            {text}
        </div>
    );
}

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
                        ¥{hotel.minPrice / 100}<span className="text-[10px] font-normal ml-0.5">起</span>
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
    const parts = displayContent.split(/(\[HOTEL_CARD_\d+\])/g);

    return parts.map((part, index) => {
        const match = part.match(/\[HOTEL_CARD_(\d+)\]/);
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
