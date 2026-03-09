import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { HotelVo } from '@/services/hotel-search';
import type { IntentSignal } from '@/types/intent';
import type { ProcessStep } from '@/components/Ai/AgentVisualization';

export function getIntentKey(intent: IntentSignal): string {
    const c = intent.context;
    return `${c.city}|${c.dateRange.start}|${c.dateRange.end}|${c.keyword}`;
}

interface AIResultsState {
    intentKey: string;
    intent: IntentSignal | null;
    reasoning: string[];
    processSteps: ProcessStep[];
    hotels: HotelVo[];
    summary: string;
    isComplete: boolean;
    vizCollapsed: boolean;
}

interface AIResultsActions {
    reset: (intent: IntentSignal) => void;
    addReasoning: (step: string) => void;
    upsertStep: (step: ProcessStep) => void;
    setHotels: (hotels: HotelVo[]) => void;
    appendSummary: (text: string) => void;
    setSummary: (summary: string) => void;
    markComplete: () => void;
    setVizCollapsed: (v: boolean) => void;
}

const EMPTY_DATA: Omit<AIResultsState, 'intentKey' | 'intent'> = {
    reasoning: [],
    processSteps: [],
    hotels: [],
    summary: '',
    isComplete: false,
    vizCollapsed: false,
};

export const useAIResultsStore = create<AIResultsState & AIResultsActions>()(
    persist(
        (set) => ({
            intentKey: '',
            intent: null,
            ...EMPTY_DATA,

            reset: (intent) => set({
                intentKey: getIntentKey(intent),
                intent,
                ...EMPTY_DATA,
            }),

            addReasoning: (step) => set((s) => ({
                reasoning: [...s.reasoning, step],
            })),

            upsertStep: (incoming) => set((s) => {
                const idx = s.processSteps.findIndex(p => p.id === incoming.id);
                if (idx === -1) return { processSteps: [...s.processSteps, incoming] };
                const copy = [...s.processSteps];
                copy[idx] = { ...copy[idx], ...incoming };
                return { processSteps: copy };
            }),

            setHotels: (hotels) => set({ hotels }),

            appendSummary: (text) => set((s) => ({ summary: s.summary + text })),

            setSummary: (summary) => set({ summary }),

            markComplete: () => set({ isComplete: true, vizCollapsed: true }),

            setVizCollapsed: (vizCollapsed) => set({ vizCollapsed }),
        }),
        {
            name: 'easu-ai-results',
            storage: createJSONStorage(() => sessionStorage),
            partialize: ({ intentKey, intent, reasoning, processSteps, hotels, summary, isComplete, vizCollapsed }) => ({
                intentKey, intent, reasoning, processSteps, hotels, summary, isComplete, vizCollapsed,
            }),
        },
    ),
);
