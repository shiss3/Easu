import { createAxiosInstance } from '@repo/utils';
import { getUserState } from '@/store/userStore.ts';
import type { AxiosRequestConfig } from 'axios';

//定义后端地址

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const redirectToLogin = () => {
    if (!window.location.pathname.includes('/login')) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
    }
};

const logoutAndRedirect = () => {
    const { logout } = getUserState();
    logout();
    redirectToLogin();
};

export const httpClient = createAxiosInstance(BASE_URL);

const httpClientRefreshState = {
    isRefreshing: false,
    refreshPromise: null as Promise<string> | null,
    queue: [] as Array<(token: string | null) => void>,
    enqueue(cb: (token: string | null) => void) {
        this.queue.push(cb);
    },
    resolveQueue(token: string | null) {
        this.queue.forEach((cb) => cb(token));
        this.queue = [];
    },
};

httpClient.interceptors.request.use((config) => {
    const { token } = getUserState();

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        const originalConfig = error.config as AxiosRequestConfig | undefined;
        const skipRefresh = originalConfig?.headers?.['x-skip-auth-refresh'] === '1';
        const { refreshToken, setAccessToken } = getUserState();

        if (skipRefresh || !refreshToken) {
            logoutAndRedirect();
            return Promise.reject(error);
        }

        if (!httpClientRefreshState.isRefreshing) {
            httpClientRefreshState.isRefreshing = true;
            httpClientRefreshState.refreshPromise = httpClient.post<{ accessToken: string }>(
                '/auth/refresh-token',
                { refreshToken },
                { headers: { 'x-skip-auth-refresh': '1' } }
            ).then((res) => {
                setAccessToken(res.data.accessToken);
                httpClientRefreshState.resolveQueue(res.data.accessToken);
                return res.data.accessToken;
            }).catch((refreshError) => {
                httpClientRefreshState.resolveQueue(null);
                logoutAndRedirect();
                return Promise.reject(refreshError);
            }).finally(() => {
                httpClientRefreshState.isRefreshing = false;
                httpClientRefreshState.refreshPromise = null;
            });
        }

        return new Promise((resolve, reject) => {
            httpClientRefreshState.enqueue((newToken) => {
                if (!newToken || !originalConfig) {
                    reject(error);
                    return;
                }
                const retryConfig: AxiosRequestConfig = {
                    ...originalConfig,
                    headers: {
                        ...originalConfig.headers,
                        Authorization: `Bearer ${newToken}`,
                    }
                };
                resolve(httpClient.request(retryConfig));
            });
        });
    }
);