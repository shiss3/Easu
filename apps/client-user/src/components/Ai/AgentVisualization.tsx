import { memo, useState } from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Brain from 'lucide-react/dist/esm/icons/brain';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

export interface ProcessStep {
    id: string;
    text: string;
    status: 'loading' | 'success';
}

export const StructuredReasoningBlock = memo(({ steps }: { steps?: string[] }) => {
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

export const ProcessStepsList = memo(({ steps }: { steps?: ProcessStep[] }) => {
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
