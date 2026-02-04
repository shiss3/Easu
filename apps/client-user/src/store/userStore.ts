import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserInfo {
    id: number;
    name: string;
    phone: string;
    avatar?: string;
}

interface UserState {
    token: string | null;         // Access Token (仅内存)
    refreshToken: string | null;  // Refresh Token (持久化)
    userInfo: UserInfo | null;    // 用户信息 (持久化)

    // Actions
    setLogin: (payload: { accessToken: string; refreshToken: string; userInfo: UserInfo }) => void;
    setAccessToken: (token: string) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            token: null,
            refreshToken: null,
            userInfo: null,

            setLogin: ({ accessToken, refreshToken, userInfo }) => {
                set({
                    token: accessToken,
                    refreshToken,
                    userInfo
                });
            },

            setAccessToken: (token) => {
                set({ token });
            },

            logout: () => {
                set({ token: null, refreshToken: null, userInfo: null });
                localStorage.removeItem('user-storage');
            },
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => localStorage),
            // [关键安全策略]
            // partialize: 决定哪些字段会被存入 localStorage
            // 我们只存 refreshToken 和 userInfo，坚决不存 token (Access Token)
            partialize: (state) => ({
                refreshToken: state.refreshToken,
                userInfo: state.userInfo,
            }),
        }
    )
);

export const getUserState = () => useUserStore.getState();