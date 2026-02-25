import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@repo/database';
import {
    B_generateAccessToken,
    B_generateRefreshToken,
    B_getRefreshTokenExpiresAt,
    B_verifyRefreshToken
} from '../utils/jwt';

// B 端用户注册
export const register = async (req: Request, res: Response) => {
    try {
        const { name, password, role, phone, email } = req.body;

        // 用户是否已存在
        let existManager = await prisma.manager.findUnique({ where: { name } });
        if (existManager) {
            return res.status(400).json({ code: 400, message: '该账户已存在', data: null });
        }

        // 密码加密
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 创建管理员
        const manager = await prisma.manager.create({
            data: {
                name,
                password: hashedPassword,
                role: role,
                contact_phone: phone,
                email
            }
        });

        // 返回成功信息
        return res.status(200).json({
            code: 200,
            message: '注册成功',
            data: null
        });
    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ code: 500, message: '系统异常', data: null });
    }
};


// B 端用户登录（参数已由路由层校验）：校验账号密码，生成 token 并落库，参照 C 端
export const login = async (req: Request, res: Response) => {
    try {
        const { name, password } = req.body;

        const manager = await prisma.manager.findUnique({ where: { name } });
        if (!manager) {
            return res.status(400).json({ code: 400, message: '账号或密码错误', data: null });
        }
        if (!manager.isActive) {
            return res.status(403).json({ code: 403, message: '账号已禁用', data: null });
        }

        const isMatch = await bcrypt.compare(password, manager.password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '账号或密码错误', data: null });
        }

        const tokenManager = {
            managerId: manager.id,
            name: manager.name,
            role: manager.role
        };
        const accessToken = B_generateAccessToken(tokenManager);
        const refreshToken = B_generateRefreshToken(tokenManager);

        await prisma.managerToken.create({
            data: {
                token: refreshToken,
                managerId: manager.id,
                expiresAt: B_getRefreshTokenExpiresAt()
            }
        });

        return res.status(200).json({
            code: 200,
            message: '登录成功',
            data: {
                accessToken,
                refreshToken,
                manager: {
                    id: manager.id,
                    name: manager.name,
                    role: manager.role,
                    phone: manager.contact_phone,
                    email: manager.email
                }
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ code: 500, message: '系统异常', data: null });
    }
};

// 刷新Token
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const raw = req.body?.refreshToken;
        const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ code: 400, message: '缺少 refreshToken', data: null });
        }

        const manager = B_verifyRefreshToken(token);

        const dbToken = await prisma.managerToken.findFirst({
            where: {
                token,
                managerId: manager.managerId,
                expiresAt: { gt: new Date() }
            }
        });

        if (!dbToken) {
            return res.status(401).json({ code: 401, message: '登录已失效，请重新登录', data: null });
        }

        const newAccessToken = B_generateAccessToken({
            managerId: manager.managerId,
            name: manager.name,
            role: manager.role
        });

        return res.status(200).json({
            code: 200,
            message: '刷新成功',
            data: { accessToken: newAccessToken }
        });
    } catch (error) {
        return res.status(401).json({ code: 401, message: '登录已失效，请重新登录', data: null });
    }
};