import { useEffect, useRef, useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import X from 'lucide-react/dist/esm/icons/x';
import type { IntentSignal } from '@/types/intent';
import { AUTO_DISMISS_MS } from '@/hooks/useUserIntent';

/* ── Props ────────────────────────────────────────────────────────────── */

interface CollaborativeHintProps {
    intent: IntentSignal;
    onAccept: () => void;
    onDismiss: () => void;
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function CollaborativeHint({ intent, onAccept, onDismiss }: CollaborativeHintProps) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const onAcceptRef = useRef(onAccept);
    const onDismissRef = useRef(onDismiss);
    onAcceptRef.current = onAccept;
    onDismissRef.current = onDismiss;

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const exit = (cb: () => void) => {
        if (exiting) return;
        setExiting(true);
        setTimeout(cb, 280);
    };

    const progressPercent = visible && !exiting ? 0 : 100;

    return (
        <div
            className={`fixed bottom-20 left-4 right-4 z-50 transition-all duration-300 ease-out ${
                visible && !exiting
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0 pointer-events-none'
            }`}
        >
            <div className="relative bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
                {/* 进度条：倒计时可视化 */}
                <div className="absolute top-0 left-0 h-[3px] bg-indigo-400/40 transition-all ease-linear"
                     style={{
                         width: `${100 - progressPercent}%`,
                         transitionDuration: visible && !exiting ? `${AUTO_DISMISS_MS}ms` : '0ms',
                     }}
                />

                <div className="p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shrink-0">
                        <Sparkles size={18} className="text-indigo-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-relaxed">
                            {intent.message}
                        </p>

                        <div className="flex items-center gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => exit(() => onAcceptRef.current())}
                                className="px-5 py-1.5 bg-indigo-500 text-white text-xs font-medium rounded-full
                                           active:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                            >
                                好的
                            </button>
                            <button
                                type="button"
                                onClick={() => exit(() => onDismissRef.current())}
                                className="px-3 py-1.5 text-gray-400 text-xs active:text-gray-600 transition-colors"
                            >
                                暂时不用
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => exit(() => onDismissRef.current())}
                        className="shrink-0 p-0.5 text-gray-300 active:text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
