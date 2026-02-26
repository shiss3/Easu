import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { HotelVo } from '@/services/hotel-search';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    toolStatus?: string;
    hotels?: HotelVo[];
}

export type ChatMode = 'chat' | 'reasoner';

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    mode: ChatMode;
}

/* ── Store Shape ────────────────────────────────────────────────────── */

interface AiChatState {
    sessions: Record<string, ChatSession>;
    activeSessionId: string;
    chatMode: ChatMode;
}

interface AiChatActions {
    validateSession: () => void;
    createNewSession: () => void;
    switchSession: (id: string) => void;
    setChatMode: (mode: ChatMode) => void;
    addMessage: (message: ChatMessage) => void;
    appendAssistantContent: (messageId: string, delta: Partial<ChatMessage>) => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const SESSION_POINTER_KEY = 'ai_session_id';

const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '重庆', '三亚', '西安', '武汉', '长沙', '厦门', '青岛', '苏州'];
const HOT_TAGS = ['寄存行李', '行李寄存', '电竞', '宠物友好', '低价', '带浴缸', '近地铁', '含早', '免费停车', '亲子', '海景', '落地窗'];

export function safeGenerateId(): string {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateSmartTitle(text: string): string {
    const city = HOT_CITIES.find(c => text.includes(c));
    const tag = HOT_TAGS.find(t => text.includes(t));

    if (city && tag) return `${city}${tag}酒店`;
    if (city) return `${city}酒店检索`;
    if (tag) return `${tag}酒店检索`;
    return text.slice(0, 10);
}

function readOrCreateSessionId(): string {
    if (typeof window === 'undefined') return safeGenerateId();

    const stored = sessionStorage.getItem(SESSION_POINTER_KEY);
    if (stored) return stored;

    const fresh = safeGenerateId();
    sessionStorage.setItem(SESSION_POINTER_KEY, fresh);
    return fresh;
}

/* ── Store ───────────────────────────────────────────────────────────── */

export const useAiChatStore = create<AiChatState & AiChatActions>()(
    persist(
        (set, get) => ({
            sessions: {},
            activeSessionId: readOrCreateSessionId(),
            chatMode: 'chat',

            validateSession() {
                const { activeSessionId, sessions } = get();
                if (sessions[activeSessionId]) return;

                const storedId = typeof window !== 'undefined'
                    ? sessionStorage.getItem(SESSION_POINTER_KEY)
                    : null;

                if (storedId && storedId === activeSessionId) return;

                const freshId = safeGenerateId();
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(SESSION_POINTER_KEY, freshId);
                }
                set({ activeSessionId: freshId });
            },

            createNewSession() {
                const freshId = safeGenerateId();
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(SESSION_POINTER_KEY, freshId);
                }
                set({ activeSessionId: freshId });
            },

            switchSession(id) {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem(SESSION_POINTER_KEY, id);
                }
                set({ activeSessionId: id });
            },

            setChatMode(mode) {
                set({ chatMode: mode });
            },

            addMessage(message) {
                const { activeSessionId, sessions, chatMode } = get();
                const session = sessions[activeSessionId];

                if (session) {
                    set({
                        sessions: {
                            ...sessions,
                            [activeSessionId]: {
                                ...session,
                                updatedAt: Date.now(),
                                messages: [...session.messages, message],
                            },
                        },
                    });
                } else {
                    const title = message.content
                        ? generateSmartTitle(message.content)
                        : '新对话';

                    set({
                        sessions: {
                            ...sessions,
                            [activeSessionId]: {
                                id: activeSessionId,
                                title,
                                updatedAt: Date.now(),
                                mode: chatMode,
                                messages: [message],
                            },
                        },
                    });
                }
            },

            appendAssistantContent(messageId, delta) {
                set((state) => {
                    const session = state.sessions[state.activeSessionId];
                    if (!session) return state;

                    const msgIndex = session.messages.findIndex(m => m.id === messageId);
                    if (msgIndex === -1) return state;

                    const target = session.messages[msgIndex];
                    const updated: ChatMessage = {
                        ...target,
                        content: delta.content !== undefined
                            ? target.content + delta.content
                            : target.content,
                        reasoning: delta.reasoning !== undefined
                            ? (target.reasoning ?? '') + delta.reasoning
                            : target.reasoning,
                        toolStatus: delta.toolStatus !== undefined
                            ? delta.toolStatus
                            : target.toolStatus,
                        hotels: delta.hotels !== undefined
                            ? delta.hotels
                            : target.hotels,
                    };

                    const newMessages = [...session.messages];
                    newMessages[msgIndex] = updated;

                    return {
                        ...state,
                        sessions: {
                            ...state.sessions,
                            [state.activeSessionId]: {
                                ...session,
                                updatedAt: Date.now(),
                                messages: newMessages,
                            },
                        },
                    };
                });
            },
        }),
        {
            name: 'ai-chat-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ sessions: state.sessions }),
        },
    ),
);
