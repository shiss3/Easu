import { createHttpClient } from '@repo/utils';

//定义后端地址 (通常从环境变量取)

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const httpClient = createHttpClient(BASE_URL, {
    // 这里配置 C 端专属的拦截逻辑
    requestInterceptor: (config) => {
        // C端用户登录后的 Token 存在 localStorage 的 'c_token' 字段里
        const token = localStorage.getItem('c_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    responseInterceptorCatch: (error) => {
        //Token 过期自动跳登录
        if (error.response?.status === 401) {
            localStorage.removeItem('c_token');
            // 这里的 window.location 是因为在 lib 里不好用 react-router
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
});