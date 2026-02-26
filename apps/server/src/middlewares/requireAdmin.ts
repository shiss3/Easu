import { Response, NextFunction } from 'express';
import type { ManagerRequest } from './requireManager';

// 在 requireManager 之后使用，仅管理员可访问
export function requireAdmin(req: ManagerRequest, res: Response, next: NextFunction) {
    if (req.managerRole !== 'ADMIN') {
        return res.status(403).json({ code: 403, message: '仅管理员可操作', data: null });
    }
    next();
}
