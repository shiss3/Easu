import { Request, Response, NextFunction } from 'express';
import { B_verifyAccessToken } from '../utils/jwt';

export interface ManagerRequest extends Request {
    managerId: number;
    managerRole: string;
}

// 解析B端token，允许商户或管理员，并将managerId、managerRole挂到req上
export function requireManager(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '请先登录', data: null });
    }
    const token = authHeader.slice(7);
    try {
        const payload = B_verifyAccessToken(token);
        if (payload.role !== 'MERCHANT' && payload.role !== 'ADMIN') {
            return res.status(403).json({ code: 403, message: '无权限', data: null });
        }
        (req as ManagerRequest).managerId = payload.managerId;
        (req as ManagerRequest).managerRole = payload.role;
        next();
    } catch {
        return res.status(401).json({ code: 401, message: '登录已失效，请重新登录', data: null });
    }
}
