import { Request, Response, NextFunction } from 'express';
import { B_verifyAccessToken } from '../utils/jwt';

export interface MerchantRequest extends Request {
    managerId: number;
    managerRole: string;
}

/** 解析 B 端 token，校验为商户角色，并将 managerId、role 挂到 req 上 */
export function requireMerchant(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '请先登录', data: null });
    }
    const token = authHeader.slice(7);
    try {
        const payload = B_verifyAccessToken(token);
        if (payload.role !== 'MERCHANT') {
            return res.status(403).json({ code: 403, message: '仅商户可操作', data: null });
        }
        (req as MerchantRequest).managerId = payload.managerId;
        (req as MerchantRequest).managerRole = payload.role;
        next();
    } catch {
        return res.status(401).json({ code: 401, message: '登录已失效，请重新登录', data: null });
    }
}
