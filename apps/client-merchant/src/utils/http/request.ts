import http from "./http";

export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}

export function get<T = unknown>(url: string, params?: unknown): Promise<ApiResponse<T>> {
    return http.get(url, { params }) as Promise<ApiResponse<T>>;
}

export function post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return http.post(url, data) as Promise<ApiResponse<T>>;
}

export function patch<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return http.patch(url, data) as Promise<ApiResponse<T>>;
}