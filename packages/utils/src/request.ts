import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from './type';

export const createAxiosInstance = (
    baseUrl: string,
    options: AxiosRequestConfig = {}
): AxiosInstance => {
    const instance = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    instance.interceptors.response.use(
        (response) => {
            const resData = response.data as ApiResponse;

            if (resData.code !== 200) {
                console.error(`[API Error] ${resData.message}`);
                throw new Error(resData.message || '系统异常');
            }

            return resData as any;
        },
        (error) => {
            console.error('[Network Error]', error);
            return Promise.reject(error);
        }
    );

    return instance;
};