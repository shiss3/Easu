import { httpClient } from '@/lib/http';


// 入参定义
export interface LoginParams {
    phone: string;
    loginType: 'code' | 'password';
    credential: string; // 验证码 或 密码
    device?: string;
}

// 响应数据定义 (对应后端 UserToken)
export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: number;
        name: string;
        phone: string;
        avatar?: string;
    };
}

export const authApi = {
    // 发送验证码
    sendCode: (phone: string) => {
        return httpClient.post<null>('/auth/send-code', { phone });
    },

    // 登录
    login: (data: LoginParams) => {
        return httpClient.post<LoginResponse>('/auth/login', data);
    },

    // 刷新 Access Token
    refreshToken: (refreshToken: string) => {
        return httpClient.post<{ accessToken: string }>(
            '/auth/refresh-token',
            { refreshToken },
            { headers: { 'x-skip-auth-refresh': '1' } }
        );
    },
};