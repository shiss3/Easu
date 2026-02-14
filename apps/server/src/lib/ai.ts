import OpenAI from 'openai';

const { ARK_API_KEY, ARK_BASE_URL, ARK_MODEL_CHAT, ARK_MODEL_REASONER } = process.env;

if (!ARK_API_KEY) {
    throw new Error('Missing environment variable: ARK_API_KEY');
}

if (!ARK_BASE_URL) {
    throw new Error('Missing environment variable: ARK_BASE_URL');
}

if (!ARK_MODEL_CHAT) {
    throw new Error('Missing environment variable: ARK_MODEL_CHAT');
}

if (!ARK_MODEL_REASONER) {
    throw new Error('Missing environment variable: ARK_MODEL_REASONER');
}

export const MODEL_CHAT = ARK_MODEL_CHAT;
export const MODEL_REASONER = ARK_MODEL_REASONER;

export const doubaoClient = new OpenAI({
    apiKey: ARK_API_KEY,
    baseURL: ARK_BASE_URL,
});
