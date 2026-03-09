import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const MODEL_ID = 'Xenova/nli-deberta-v3-xsmall';
const DEFAULT_LABELS = [
    'searching for hotels to book',
    'comparing hotel prices and ratings',
    'browsing casually without clear intent',
];

interface ClassifierFn {
    (text: string, labels: string[]): Promise<{ labels: string[]; scores: number[] }>;
    dispose?: () => void;
}

let classifier: ClassifierFn | null = null;

async function load() {
    if (classifier) {
        postMessage({ type: 'status', status: 'ready' });
        return;
    }

    postMessage({ type: 'status', status: 'loading' });

    const progressCb = (info: { status: string; progress?: number }) => {
        if (info.status === 'progress' && info.progress != null) {
            postMessage({ type: 'progress', progress: Math.round(info.progress) });
        }
    };

    try {
        classifier = await pipeline('zero-shot-classification', MODEL_ID, {
            device: 'webgpu',
            progress_callback: progressCb,
        }) as unknown as ClassifierFn;
        postMessage({ type: 'status', status: 'ready' });
        return;
    } catch {
        // WebGPU unavailable or failed — fall back to WASM
    }

    try {
        classifier = await pipeline('zero-shot-classification', MODEL_ID, {
            progress_callback: progressCb,
        }) as unknown as ClassifierFn;
        postMessage({ type: 'status', status: 'ready' });
    } catch (e) {
        postMessage({ type: 'status', status: 'error', error: String(e) });
    }
}

async function classify(id: string, text: string, labels?: string[]) {
    if (!classifier) {
        postMessage({ type: 'result', id, error: 'not_loaded' });
        return;
    }

    try {
        const out = await classifier(text, labels || DEFAULT_LABELS);
        postMessage({
            type: 'result',
            id,
            labels: out.labels,
            scores: out.scores,
        });
    } catch (e) {
        postMessage({ type: 'result', id, error: String(e) });
    }
}

onmessage = (e: MessageEvent) => {
    const msg = e.data;
    switch (msg.type) {
        case 'load': load(); break;
        case 'classify': classify(msg.id, msg.text, msg.labels); break;
    }
};
