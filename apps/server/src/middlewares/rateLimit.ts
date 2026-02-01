import rateLimit from 'express-rate-limit';

// 发送验证码限流：每 IP 60秒只能请求 1 次
export const sendCodeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 429,
        message: '操作太频繁，请1分钟后再试',
        data: null
    }
});