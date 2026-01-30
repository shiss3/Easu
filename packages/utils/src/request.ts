import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig
} from 'axios';
import { ApiResponse } from './type';

// 定义允许外部传入的自定义拦截器类型
interface InterceptorHooks {
    requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
    requestInterceptorCatch?: (error: any) => any;
    responseInterceptor?: (response: AxiosResponse) => AxiosResponse;
    responseInterceptorCatch?: (error: any) => any;
}

// 工厂函数：创建请求实例
export const createHttpClient = (
    baseUrl: string,
    hooks?: InterceptorHooks,
    options: AxiosRequestConfig = {}
) => {
    const instance: AxiosInstance = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    // 1. 注册自定义请求拦截器 (例如：添加 Token)
    instance.interceptors.request.use(
        hooks?.requestInterceptor || ((config) => config),
        hooks?.requestInterceptorCatch || ((error) => Promise.reject(error))
    );

    // 2. 注册通用响应拦截器
    instance.interceptors.response.use(
        (response) => {
            // 如果有自定义响应逻辑，先执行
            if (hooks?.responseInterceptor) {
                response = hooks.responseInterceptor(response);
            }

            const resData = response.data as ApiResponse;

            // 统一处理业务状态码
            if (resData.code !== 200) {
                // 这里可以做一些通用的错误打印，或者抛出异常让业务层捕获
                console.warn(`[API Error] ${resData.message}`);
                return Promise.reject(new Error(resData.message || '系统异常'));
            }

            return response;
        },
        (error) => {
            if (hooks?.responseInterceptorCatch) {
                return hooks.responseInterceptorCatch(error);
            }
            // 默认的 HTTP 错误处理
            let message = error.message || '请求失败';
            if (error.response?.status === 401) {
                message = '未授权，请登录';
            } else if (error.response?.status === 500) {
                message = '服务器内部错误';
            }
            console.error(`[Network Error] ${message}`);
            return Promise.reject(error);
        }
    );

    // 3. 导出精简的 Get/Post 方法
    return {
        get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
            return instance.get(url, config).then((res) => res.data);
        },
        post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
            return instance.post(url, data, config).then((res) => res.data);
        }
    };
};