import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserInfo {
    id: number;
    name: string;
    phone: string;
    avatar?: string;
}

interface UserState {
    token: string | null;
    userInfo: UserInfo | null;
    // Actions
    setLogin: (payload: { token: string; userInfo: UserInfo }) => void;
    logout: () => void;
}

// 创建 Store 实例
export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            token: null,
            userInfo: null,

            setLogin: ({ token, userInfo }) => {
                set({ token, userInfo });
            },

            logout: () => {
                set({ token: null, userInfo: null });
                //以此确保清理彻底，也可以选择仅置空状态
                localStorage.removeItem('user-storage');
            },
        }),
        {
            name: 'user-storage', // localStorage key
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// 导出非 Hook 的读取方式，供 Axios 拦截器使用
export const getUserState = () => useUserStore.getState();