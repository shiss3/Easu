import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate';
import { sendCodeLimiter } from '../middlewares/rateLimit';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

// Zod Schemas
const sendCodeSchema = z.object({
    body: z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
    }),
});

const loginSchema = z.object({
    body: z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
        loginType: z.enum(['code', 'password'], {
                message: '登录类型错误'  }),
        // 如果是 password 类型，credential 是密码；如果是 code 类型，credential 是验证码
        credential: z.string().min(1, '凭证不能为空'),
        device: z.string().optional(),
    }),
});

const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1),
    }),
});

// Routes
// 发送验证码 (应用限流)
router.post(
    '/send-code',
    sendCodeLimiter,
    validate(sendCodeSchema),
    AuthController.sendCode
);

// 登录/注册
router.post(
    '/login',
    validate(loginSchema),
    AuthController.login
);

// 刷新 Token
router.post(
    '/refresh-token',
    validate(refreshTokenSchema),
    AuthController.refreshToken
);

export default router;