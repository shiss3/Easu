import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 定义通用的响应结构
export interface ApiResponse<T = any> {
    code: number;
    data: T;
    message: string;
}

class Request {
    private instance: AxiosInstance;

    constructor(config: AxiosRequestConfig) {
        this.instance = axios.create(config);

        // 请求拦截器
        this.instance.interceptors.request.use(
            (config) => {
                // 这里可以统一添加 token
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response: AxiosResponse<ApiResponse>) => {
                const { code, data, message } = response.data;
                if (code === 200) {
                    return response;
                } else {
                    // 处理业务错误，如 Token 过期等
                    console.error(message);
                    return Promise.reject(new Error(message));
                }
            },
            (error) => {
                // 处理 HTTP 错误
                return Promise.reject(error);
            }
        );
    }

    public request(config: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.instance.request(config);
    }

    public get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.instance.get(url, config).then(res => res.data);
    }

    public post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.instance.post(url, data, config).then(res => res.data);
    }
}

// 导出默认实例，基础URL可以根据环境变量配置
export const httpClient = new Request({
    baseURL: import.meta.env?.VITE_API_URL || '/api', // 兼容 Vite 环境变量
    timeout: 10000,
});