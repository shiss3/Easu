import { useEffect, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Brain from 'lucide-react/dist/esm/icons/brain';
import X from 'lucide-react/dist/esm/icons/x';
import type { ChatMode } from '@/store/aiChatStore';

interface ModelSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMode: ChatMode;
    onSelect: (mode: ChatMode) => void;
}

const MODELS: { mode: ChatMode; label: string; desc: string; Icon: typeof Brain }[] = [
    { mode: 'chat', label: '智能搜索', desc: '快速精准的酒店搜索与推荐', Icon: MessageCircle },
    { mode: 'reasoner', label: '深度思考', desc: '多步推理，更深度的旅行规划', Icon: Brain },
];

export default function ModelSelectorModal({ isOpen, onClose, currentMode, onSelect }: ModelSelectorModalProps) {
    const [visible, setVisible] = useState(false);

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

    return (
        <div className="fixed inset-0 z-50" onClick={handleClose}>
            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} />

            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-base font-semibold text-slate-800">选择模型</h3>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 pb-8 space-y-2">
                    {MODELS.map(({ mode, label, desc, Icon }) => {
                        const active = mode === currentMode;
                        return (
                            <button
                                key={mode}
                                onClick={() => { onSelect(mode); handleClose(); }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${active ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                            >
                                <Icon size={20} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                <div className="flex-1 text-left">
                                    <span className={`text-sm font-medium ${active ? 'text-blue-600' : 'text-slate-700'}`}>{label}</span>
                                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                </div>
                                {active && <Check size={18} className="text-blue-600 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
