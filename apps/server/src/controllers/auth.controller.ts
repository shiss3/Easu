import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { prisma } from '@repo/database';
import { SmsService } from '../services/sms.service';
import {
    generateAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiresAt,
    verifyRefreshToken
} from '../utils/jwt';

// 发送验证码
export const sendCode = async (req: Request, res: Response) => {
    const { phone } = req.body;
    // 生成 6 位随机数
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await SmsService.sendSMS(phone, code);

    res.json({ code: 200, message: '验证码已发送', data: null });
};

// 登录/注册
export const login = async (req: Request, res: Response) => {
    try {
        const { phone, loginType, credential, device = 'Unknown' } = req.body;
        let user = await prisma.user.findUnique({ where: { phone } });

        // 验证码登录 (自动注册) ---
        if (loginType === 'code') {
            const isValid = SmsService.verifyCode(phone, credential);
            if (!isValid) {
                return res.status(400).json({ code: 400, message: '验证码错误或已过期', data: null });
            }

            // 如果用户不存在，自动注册
            if (!user) {
                user = await prisma.user.create({
                    data: { phone, role: 'USER' }
                });
            }
        }
        // 密码登录 (防暴力破解) ---
        else if (loginType === 'password') {
            if (!user) {
                return res.status(400).json({ code: 400, message: '账号或密码错误', data: null });
            }

            // 检查是否被锁定
            if (user.lockoutUntil && dayjs(user.lockoutUntil).isAfter(dayjs())) {
                const waitMinutes = dayjs(user.lockoutUntil).diff(dayjs(), 'minute');
                return res.status(403).json({
                    code: 403,
                    message: `账号已锁定，请 ${waitMinutes + 1} 分钟后再试`,
                    data: null
                });
            }

            // 校验密码
            const isMatch = user.password ? await bcrypt.compare(credential, user.password) : false;

            if (!isMatch) {
                // 增加失败次数
                const newAttempts = user.failedLoginAttempts + 1;
                let updateData: any = { failedLoginAttempts: newAttempts };
                let warningMsg = '账号或密码错误';

                // 连续失败 5 次，锁定 30 分钟
                if (newAttempts >= 5) {
                    updateData.lockoutUntil = dayjs().add(30, 'minute').toDate();
                    warningMsg = '密码错误次数过多，账号已锁定30分钟';
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });

                return res.status(400).json({ code: 400, message: warningMsg, data: { attempts: newAttempts } });
            }

            // 登录成功，重置计数器
            if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: 0, lockoutUntil: null }
                });
            }
        }

        // 生成 Token 并落库
        if (!user) throw new Error('User process failed');

        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

        // 将 RefreshToken 存入数据库，支持多端登录管理
        await prisma.userToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                device: device,
                expiresAt: getRefreshTokenExpiresAt(),
            }
        });

        res.json({
            code: 200,
            message: '登录成功',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    avatar: user.avatar
                }
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ code: 500, message: '系统异常', data: null });
    }
};

// 刷新 Token
export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        // 校验签名是否合法
        const payload = verifyRefreshToken(refreshToken);

        // 查库：Token 是否存在且未物理过期
        // (JWT 虽然有 exp，但数据库记录允许我们在服务端主动撤销某个 Token)
        const dbToken = await prisma.userToken.findFirst({
            where: {
                token: refreshToken,
                userId: payload.userId,
                expiresAt: { gt: new Date() } // 必须未过期
            }
        });

        if (!dbToken) {
            return res.status(401).json({ code: 401, message: '登录已失效，请重新登录', data: null });
        }

        // 签发新的 Access Token
        const newAccessToken = generateAccessToken({ userId: payload.userId, role: payload.role });

        // 这里只返回新的 AccessToken，RefreshToken 保持不变直到过期

        res.json({
            code: 200,
            message: '刷新成功',
            data: { accessToken: newAccessToken }
        });

    } catch (error) {
        return res.status(401).json({ code: 401, message: 'Invalid Refresh Token', data: null });
    }
};