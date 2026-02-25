import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate';
import * as AuthManagerController from '../controllers/auth-manager.controller';

const router = Router();

// Zod Schemas
//注册
const registerSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, '用户名不能为空'),
        password: z.string().trim().min(6, '密码至少6位'),
        phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
        email: z.string().trim().email('邮箱格式不正确'),
        role: z.enum(['MERCHANT', 'ADMIN'])
    }),
});

// 登录
const loginSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, '用户名不能为空'),
        password: z.string().trim().min(1, '密码不能为空'),
    }),
});

// 刷新 Token
const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'refreshToken 不能为空'),
    }),
});

// Routes
//注册
router.post(
    '/register',
    validate(registerSchema),
    AuthManagerController.register
);

// 登录
router.post(
    '/login',
    validate(loginSchema),
    AuthManagerController.login
);

// 刷新 Token
router.post(
    '/refresh-token',
    validate(refreshTokenSchema),
    AuthManagerController.refreshToken
);

export default router;
