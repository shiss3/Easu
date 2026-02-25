import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

interface TokenPayload {
    userId: number;
    role: string;
}

interface TokenManager {
    managerId: number;
    name: string;
    role: 'MERCHANT' | 'ADMIN';
    hotelId?: number;
}

// 生成短效 Access Token (15分钟)
export const generateAccessToken = (payload: TokenPayload) => {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

// 生成短效 Access Token (2小时)（b端用户场景）
export const B_generateAccessToken = (manager: TokenManager) => {
    return jwt.sign(manager, ACCESS_SECRET, { expiresIn: '2h' });
};

// 生成长效 Refresh Token (7天)
export const generateRefreshToken = (payload: TokenPayload) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

// 生成长效 Refresh Token (15天)（b端用户场景）
export const B_generateRefreshToken = (manager: TokenManager) => {
    return jwt.sign(manager, REFRESH_SECRET, { expiresIn: '15d' });
};

// 计算 Refresh Token 的物理过期时间对象
export const getRefreshTokenExpiresAt = () => {
    return dayjs().add(7, 'day').toDate();
};

// 计算 Refresh Token 的物理过期时间对象（b端用户场景）
export const B_getRefreshTokenExpiresAt = () => {
    return dayjs().add(15, 'day').toDate();
};

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const B_verifyAccessToken = (token: string) => {
    return jwt.verify(token, ACCESS_SECRET) as TokenManager;
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};

export const B_verifyRefreshToken = (token: string) => {
    return jwt.verify(token, REFRESH_SECRET) as TokenManager;
};