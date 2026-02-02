import { createHttpClient } from '@repo/utils';
import {getUserState} from "@/store/userStore.ts";

//定义后端地址

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const httpClient = createHttpClient(BASE_URL, {
    // 这里配置 C 端专属的拦截逻辑
    requestInterceptor: (config) => {
        // 直接从 Store 获取最新 Token
        const { token } = getUserState();

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },

    // 2. 响应拦截器：处理 401
    responseInterceptorCatch: (error) => {
        if (error.response?.status === 401) {
            // 核心逻辑：Token 失效，清除状态并跳转
            const { logout } = getUserState();
            logout();

            // 避免重复跳转
            if (!window.location.pathname.includes('/login')) {
                // 携带当前页面路径，以便登录后跳回
                const currentPath = window.location.pathname + window.location.search;
                window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
            }
        }
        return Promise.reject(error);
    }
});