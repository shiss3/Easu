import { post } from "../utils/http/request";

export interface LoginData {
    name: string;
    password: string;
}

export type ManagerRole = 'MERCHANT' | 'ADMIN';

// 后端登录返回结构
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    manager: {
        id: number;
        name: string;
        role: ManagerRole;
        phone: string;
        email: string;
    };
}

// 用户注册信息
export interface RegisterData {
    name: string;
    password: string;
    phone: string;
    email: string;
    role: ManagerRole;
}

// 用户登录
export function login(data: LoginData) {
    return post<LoginResponse>("/auth-manager/login", data);
}

// 用户注册
export function register(data: RegisterData) {
    return post("/auth-manager/register", data);
}