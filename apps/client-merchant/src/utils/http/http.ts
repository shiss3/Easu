import { store } from "../../store";
import { setToken, logout } from "../../store/authSlice";
import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { message } from "antd";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const http: AxiosInstance = axios.create({
    baseURL,
    timeout: 20000,
});

// 请求拦截器：携带 token
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { token } = store.getState().authSlice;
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

// 响应拦截器：成功时统一返回 data；401 时尝试刷新 token 并重试
http.interceptors.response.use(
    (response: AxiosResponse) => {
        const res = response.data as { code?: number; message?: string; data?: unknown };
        if (res.code != null && res.code !== 200) {
            const msg = res.message ?? "请求失败";
            message.error(msg);
            return Promise.reject(new Error(msg));
        }
        return response.data;
    },
    async (error) => {
        const originalConfig = error.config;
        const status = error.response?.status;
        const isRefreshUrl =
            originalConfig?.url != null &&
            String(originalConfig.url).includes("refresh-token");

        if (status === 401 && !isRefreshUrl && !originalConfig._retry) {
            originalConfig._retry = true;
            const { refreshToken } = store.getState().authSlice;
            if (refreshToken) {
                try {
                    const { data } = await axios.post<{ code: number; data?: { accessToken: string } }>(
                        `${baseURL}/auth-manager/refresh-token`,
                        { refreshToken }
                    );
                    if (data?.code === 200 && data?.data?.accessToken) {
                        store.dispatch(setToken(data.data.accessToken));
                        originalConfig.headers["Authorization"] = `Bearer ${data.data.accessToken}`;
                        const retryRes = await http.request(originalConfig);
                        const retryData = (retryRes as unknown as { data?: unknown })?.data;
                        return retryData != null ? retryData : retryRes;
                    }
                } catch {
                    // 刷新失败，清除登录态
                }
            }
            store.dispatch(logout());
            message.error("登录已失效，请重新登录");
            window.location.href = "/";
        } else {
            const msg = error.response?.data?.message ?? error.message ?? "网络异常，请稍后重试";
            message.error(msg);
        }
        return Promise.reject(error);
    }
);

export default http





