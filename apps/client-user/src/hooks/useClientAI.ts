import { useCallback, useEffect, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────────── */

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ClassifyResult {
    label: string;
    score: number;
    allLabels: string[];
    allScores: number[];
}

/* ── Singleton worker shared across all hook consumers ────────────────── */

let worker: Worker | null = null;
let currentStatus: ModelStatus = 'idle';
let currentProgress = 0;
let idCounter = 0;

const listeners = new Set<() => void>();
const pending = new Map<string, {
    resolve: (r: ClassifyResult) => void;
    reject: (e: Error) => void;
}>();

function notify() { listeners.forEach(fn => fn()); }

function boot() {
    if (worker) return;

    worker = new Worker(
        new URL('../workers/intent-classifier.worker.ts', import.meta.url),
        { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;

        if (msg.type === 'status') {
            currentStatus = msg.status as ModelStatus;
            notify();
        } else if (msg.type === 'progress') {
            currentProgress = msg.progress as number;
            notify();
        } else if (msg.type === 'result') {
            const p = pending.get(msg.id as string);
            if (!p) return;
            pending.delete(msg.id as string);
            if (msg.error) {
                p.reject(new Error(msg.error as string));
            } else {
                p.resolve({
                    label: msg.labels[0],
                    score: msg.scores[0],
                    allLabels: msg.labels,
                    allScores: msg.scores,
                });
            }
        }
    };

    setTimeout(() => {
        currentStatus = 'loading';
        notify();
        worker!.postMessage({ type: 'load' });
    }, 3_000);
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useClientAI() {
    const [, tick] = useState(0);

    useEffect(() => {
        const cb = () => tick(n => n + 1);
        listeners.add(cb);
        boot();
        return () => { listeners.delete(cb); };
    }, []);

    const classify = useCallback(
        (text: string, labels?: string[]): Promise<ClassifyResult> => {
            if (!worker || currentStatus !== 'ready') {
                return Promise.reject(new Error('Model not ready'));
            }

            const id = String(++idCounter);
            return new Promise<ClassifyResult>((resolve, reject) => {
                pending.set(id, { resolve, reject });
                worker!.postMessage({ type: 'classify', id, text, labels });

                setTimeout(() => {
                    if (pending.has(id)) {
                        pending.delete(id);
                        reject(new Error('timeout'));
                    }
                }, 30_000);
            });
        },
        [],
    );

    return {
        status: currentStatus,
        progress: currentProgress,
        isReady: currentStatus === 'ready',
        classify,
    } as const;
}
