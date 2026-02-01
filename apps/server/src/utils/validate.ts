import { Request, Response, NextFunction } from 'express';
import {ZodObject, ZodError } from 'zod';

// 工厂函数：生成校验中间件
export const validate = (schema: ZodObject) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // parseAsync 允许 schema 中包含异步验证
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    code: 400,
                    message: '参数校验失败',
                    // 只返回第一个错误信息
                    data: error.issues.map(e => e.message).join(', '),
                });
            }
            return next(error);
        }
    };