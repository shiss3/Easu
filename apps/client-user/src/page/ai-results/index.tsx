import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import type { HotelVo } from '@/services/hotel-search';
import type { IntentSignal } from '@/types/intent';
import {
    StructuredReasoningBlock,
    ProcessStepsList,
    type ProcessStep,
} from '@/components/Ai/AgentVisualization';
import { HotelCard } from '@/components/SearchResult/HotelCard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/* ── Helpers ──────────────────────────────────────────────────────────── */

function upsertStep(steps: ProcessStep[], incoming: ProcessStep): ProcessStep[] {
    const idx = steps.findIndex(s => s.id === incoming.id);
    if (idx === -1) return [...steps, incoming];
    const copy = [...steps];
    copy[idx] = { ...copy[idx], ...incoming };
    return copy;
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */

const HotelCardSkeleton = () => (
    <div className="flex bg-white rounded-lg overflow-hidden shadow-sm animate-pulse h-36">
        <div className="w-1/3 bg-gray-200" />
        <div className="w-2/3 p-3 flex flex-col justify-between">
            <div>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="flex gap-0.5 mt-1.5">
                    {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-gray-200 rounded-full" />)}
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mt-2" />
                <div className="flex gap-1 mt-2">
                    <div className="h-4 bg-gray-200 rounded w-10" />
                    <div className="h-4 bg-gray-200 rounded w-10" />
                </div>
            </div>
            <div className="flex justify-end">
                <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
        </div>
    </div>
);

/* ── Page ─────────────────────────────────────────────────────────────── */

const AIResultsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const intent = (location.state as { intent?: IntentSignal } | null)?.intent;

    const [reasoning, setReasoning] = useState<string[]>([]);
    const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
    const [hotels, setHotels] = useState<HotelVo[]>([]);
    const [summary, setSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [vizCollapsed, setVizCollapsed] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const hasFetchedRef = useRef(false);

    const fetchResults = useCallback(async (signal: IntentSignal) => {
        setIsGenerating(true);
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            await fetchEventSource(`${API_BASE}/chat/intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intent: signal }),
                signal: ctrl.signal,
                openWhenHidden: true,

                onmessage(ev) {
                    let data: Record<string, unknown>;
                    try { data = JSON.parse(ev.data); } catch { return; }

                    if (ev.event === 'structured_reasoning_step') {
                        setReasoning(prev => [...prev, data.text as string]);
                    } else if (ev.event === 'process_step') {
                        setProcessSteps(prev =>
                            upsertStep(prev, data as unknown as ProcessStep),
                        );
                    } else if (ev.event === 'hotel_list') {
                        setHotels(data.hotels as HotelVo[]);
                    } else if (ev.event === 'delta') {
                        setSummary(prev => prev + (data.text as string));
                    } else if (ev.event === 'error') {
                        setSummary((data.message as string) || '抱歉，出了点问题');
                    }
                },
                onclose() {
                    setIsGenerating(false);
                    setVizCollapsed(true);
                },
                onerror(err) {
                    setIsGenerating(false);
                    if (ctrl.signal.aborted) throw err;
                },
            });
        } catch {
            if (!ctrl.signal.aborted) {
                setSummary(prev => prev || '网络连接异常，请稍后重试。');
            }
        } finally {
            setIsGenerating(false);
        }
    }, []);

    useEffect(() => {
        if (!intent || hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        fetchResults(intent);
        return () => { abortRef.current?.abort(); };
    }, [intent, fetchResults]);

    if (!intent) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-6 text-center">
                <Sparkles size={40} className="text-indigo-400 mb-4" />
                <p className="text-gray-500 mb-4">未检测到搜索意图</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-full text-sm"
                >
                    返回首页
                </button>
            </div>
        );
    }

    const hasHotels = hotels.length > 0;
    const showSkeleton = isGenerating && !hasHotels;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center px-4 py-3">
                    <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-slate-800">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="ml-2 flex items-center gap-1.5">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className="font-semibold text-slate-800">AI 智能推荐</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto">
                {/* 可折叠全链路可视化 */}
                <div className="mx-3 mt-3">
                    <button
                        onClick={() => setVizCollapsed(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-t-xl border border-gray-100 text-xs text-slate-500"
                    >
                        <span className="font-medium">Agent 推理过程</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${vizCollapsed ? '' : 'rotate-180'}`}
                        />
                    </button>
                    {!vizCollapsed && (
                        <div className="bg-white px-3 pb-3 border-x border-b border-gray-100 rounded-b-xl space-y-2">
                            <StructuredReasoningBlock steps={reasoning} />
                            <ProcessStepsList steps={processSteps} />
                        </div>
                    )}
                </div>

                {/* AI 推荐总结 */}
                {(summary || isGenerating) && (
                    <div className="mx-3 mt-3 p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                        <div className="flex items-start gap-2">
                            <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {summary || (
                                    <span className="inline-flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 酒店列表 */}
                <div className="px-3 pt-3 pb-6 flex flex-col gap-3">
                    {showSkeleton
                        ? Array.from({ length: 4 }, (_, i) => <HotelCardSkeleton key={i} />)
                        : hotels.map(hotel => (
                            <div key={hotel.id} className="h-36">
                                <HotelCard data={hotel} />
                            </div>
                        ))
                    }
                    {!isGenerating && hasHotels && (
                        <p className="text-center text-xs text-gray-400 py-2">
                            — 共 {hotels.length} 家推荐酒店 —
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIResultsPage;
