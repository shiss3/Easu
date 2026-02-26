import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import X from 'lucide-react/dist/esm/icons/x';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import { useAiChatStore } from '@/store/aiChatStore.ts';

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
    const [visible, setVisible] = useState(false);
    const sessions = useAiChatStore(state => state.sessions);
    const activeSessionId = useAiChatStore(state => state.activeSessionId);

    const sortedSessions = useMemo(
        () => Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt),
        [sessions],
    );

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const handleSelect = (id: string) => {
        useAiChatStore.getState().switchSession(id);
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50" onClick={handleClose}>
            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} />

            <div
                className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
                    <h3 className="text-base font-semibold text-slate-800">历史对话</h3>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-8">
                    {sortedSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <MessageSquare size={36} />
                            <span className="mt-2 text-sm">暂无历史对话</span>
                        </div>
                    ) : (
                        sortedSessions.map(session => {
                            const active = session.id === activeSessionId;
                            return (
                                <button
                                    key={session.id}
                                    onClick={() => handleSelect(session.id)}
                                    className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                    <p className={`text-sm truncate ${active ? 'text-blue-600 font-medium' : 'text-slate-700'}`}>
                                        {session.title}
                                    </p>
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                                        {dayjs(session.updatedAt).format('MM-DD HH:mm')}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
