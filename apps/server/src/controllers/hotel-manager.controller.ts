import { Response } from 'express';
import { prisma } from '@repo/database';
import { uploadToOSS } from '../services/upload.service';
import type { ManagerRequest } from '../middlewares/requireManager';


enum ReviewProcess {
    PENDING = 'PENDING',
    PUBLISHED = 'PUBLISHED',
    REJECTED = 'REJECTED',
    DRAFT = 'DRAFT',
}

/** 创建酒店请求体（与前端 CreateHotelPayload 一致） */
export interface CreateHotelBody {
    name: string;
    address: string;
    city: string;
    star: number;
    coverImage: string;
    images: string[];
    description?: string;
    tags: string[];
    priceDesc?: string;
    roomTypes: {
        name: string;
        price: number;
        bedInfo: string;
        images: string[];
        inventory: number;
    }[];
}

/** 单张图片上传：上传至阿里云 OSS，返回永久地址 */
export const uploadImage = async (req: ManagerRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ code: 400, message: '请选择要上传的图片', data: null });
        }
        const url = await uploadToOSS(file);
        return res.status(200).json({ code: 200, message: '上传成功', data: { url } });
    } catch (err) {
        console.error('Upload Error:', err);
        return res.status(500).json({ code: 500, message: '图片上传失败', data: null });
    }
};

/** 商户创建酒店：仅商户可创建，写入 ownerId，创建酒店+房型+库存，图片字段存 OSS 永久地址 */
export const createMerchantHotel = async (req: ManagerRequest, res: Response) => {
    try {
        if (req.managerRole !== 'MERCHANT') {
            return res.status(403).json({ code: 403, message: '仅商户可创建酒店', data: null });
        }
        const managerId = req.managerId;
        const body = req.body as CreateHotelBody;

        if (!body.name?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写酒店名称', data: null });
        }
        if (!body.address?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写酒店地址', data: null });
        }
        if (!body.city?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写城市', data: null });
        }
        if (!Array.isArray(body.roomTypes) || body.roomTypes.length === 0) {
            return res.status(400).json({ code: 400, message: '请至少添加一个房型', data: null });
        }

        const coverImage = typeof body.coverImage === 'string' ? body.coverImage : '';
        const images = Array.isArray(body.images) ? body.images : [];
        const tags = Array.isArray(body.tags) ? body.tags : [];

        const hotel = await prisma.hotel.create({
            data: {
                name: body.name.trim(),
                address: body.address.trim(),
                city: body.city.trim(),
                star: typeof body.star === 'number' ? Math.min(5, Math.max(0, body.star)) : 0,
                latitude: null,
                longitude: null,
                coverImage: coverImage || '',
                images: images,
                description: body.description?.trim() ?? null,
                tags,
                priceDesc: body.priceDesc?.trim() ?? null,
                status: 1,
                sortOrder: 0,
                score: 5.0,
                reviewCount: 0,
                checking: ReviewProcess.PENDING,
                adminNote: null,
                ownerId: managerId,
            },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < body.roomTypes.length; i++) {
            const rt = body.roomTypes[i];
            const roomImages = Array.isArray(rt.images) ? rt.images : [];
            const priceFen = Math.round((typeof rt.price === 'number' ? rt.price : 0) * 100);
            const quota = Math.max(0, typeof rt.inventory === 'number' ? rt.inventory : 0);

            const roomType = await prisma.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name: (rt.name ?? '').trim() || `房型${i + 1}`,
                    price: priceFen,
                    bedInfo: (rt.bedInfo ?? '').trim() || '',
                    images: roomImages,
                    salesVolume: 0,
                    sortOrder: i,
                },
            });

            const inventoryRows = Array.from({ length: 365 }, (_, d) => {
                const date = new Date(today);
                date.setDate(date.getDate() + d);
                return { roomTypeId: roomType.id, date, price: priceFen, quota };
            });
            await prisma.roomInventory.createMany({ data: inventoryRows });
        }

        return res.status(201).json({
            code: 200,
            message: '创建成功，请等待审核',
            data: {
                id: hotel.id,
                name: hotel.name,
                address: hotel.address,
                city: hotel.city,
                star: hotel.star,
                coverImage: hotel.coverImage,
                images: hotel.images,
                checking: hotel.checking,
                status: hotel.status,
            },
        });
    } catch (err) {
        console.error('CreateHotel Error:', err);
        return res.status(500).json({ code: 500, message: '创建酒店失败', data: null });
    }
};

/** 获取单酒店详情（编辑用）：商户仅能查自己的，管理员可查任意；含房型及首日库存 */
export const getHotelDetailForEdit = async (req: ManagerRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const hotelId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam ?? '', 10);
        if (!Number.isFinite(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }
        const { managerRole: role, managerId } = req;

        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: {
                roomTypes: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        inventories: { take: 1, orderBy: { date: 'asc' } },
                    },
                },
            },
        });
        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }
        if (role === 'MERCHANT' && hotel.ownerId !== managerId) {
            return res.status(403).json({ code: 403, message: '无权限查看该酒店', data: null });
        }

        const roomTypes = hotel.roomTypes.map((rt) => ({
            id: rt.id,
            name: rt.name,
            price: rt.price / 100,
            bedInfo: rt.bedInfo,
            images: rt.images,
            inventory: rt.inventories[0]?.quota ?? 10,
        }));

        return res.status(200).json({
            code: 200,
            message: 'success',
            data: {
                id: hotel.id,
                name: hotel.name,
                address: hotel.address,
                city: hotel.city,
                star: hotel.star,
                coverImage: hotel.coverImage,
                images: hotel.images,
                description: hotel.description ?? undefined,
                tags: hotel.tags,
                priceDesc: hotel.priceDesc ?? undefined,
                checking: hotel.checking,
                status: hotel.status,
                adminNote: hotel.adminNote ?? undefined,
                roomTypes,
            },
        });
    } catch (err) {
        console.error('getHotelDetailForEdit Error:', err);
        return res.status(500).json({ code: 500, message: '获取酒店详情失败', data: null });
    }
};

/** 统一更新接口：管理员传 action+adminNote 仅更新审核；商户传完整酒店信息则更新并置为待审核 */
export const updateHotel = async (req: ManagerRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const hotelId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam ?? '', 10);
        if (!Number.isFinite(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }
        const body = req.body as Record<string, unknown>;
        const { managerRole: role, managerId } = req;

        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }

        if (body.action === 'APPROVE' || body.action === 'REJECT') {
            if (role !== 'ADMIN') {
                return res.status(403).json({ code: 403, message: '仅管理员可审核', data: null });
            }
            if (hotel.checking === ReviewProcess.PUBLISHED) {
                return res.status(400).json({ code: 400, message: '已发布酒店不可再审核', data: null });
            }
            const adminNoteStr = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';
            if (body.action === 'REJECT' && !adminNoteStr) {
                return res.status(400).json({ code: 400, message: '拒绝时审核意见为必填项', data: null });
            }
            const checking = body.action === 'APPROVE' ? ReviewProcess.PUBLISHED : ReviewProcess.REJECTED;
            const adminNote = body.action === 'REJECT' ? adminNoteStr : null;
            await prisma.hotel.update({
                where: { id: hotelId },
                data: { checking, adminNote },
            });
            return res.status(200).json({
                code: 200,
                message: body.action === 'APPROVE' ? '已通过' : '已拒绝',
                data: null,
            });
        }

        if (role !== 'MERCHANT') {
            return res.status(403).json({ code: 403, message: '仅商户可编辑酒店信息', data: null });
        }
        if (hotel.ownerId !== managerId) {
            return res.status(403).json({ code: 403, message: '无权限编辑该酒店', data: null });
        }

        const data = body as unknown as CreateHotelBody;
        if (!data.name?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写酒店名称', data: null });
        }
        if (!data.address?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写酒店地址', data: null });
        }
        if (!data.city?.trim()) {
            return res.status(400).json({ code: 400, message: '请填写城市', data: null });
        }
        if (!Array.isArray(data.roomTypes) || data.roomTypes.length === 0) {
            return res.status(400).json({ code: 400, message: '请至少添加一个房型', data: null });
        }

        const coverImage = typeof data.coverImage === 'string' ? data.coverImage : '';
        const images = Array.isArray(data.images) ? data.images : [];
        const tags = Array.isArray(data.tags) ? data.tags : [];

        await prisma.hotel.update({
            where: { id: hotelId },
            data: {
                name: data.name.trim(),
                address: data.address.trim(),
                city: data.city.trim(),
                star: typeof data.star === 'number' ? Math.min(5, Math.max(0, data.star)) : 0,
                coverImage: coverImage || '',
                images,
                description: data.description?.trim() ?? null,
                tags,
                priceDesc: data.priceDesc?.trim() ?? null,
                checking: ReviewProcess.PENDING,
                adminNote: null,
            },
        });

        const existingRoomTypes = await prisma.roomType.findMany({ where: { hotelId }, select: { id: true } });
        const roomTypeIds = existingRoomTypes.map((r) => r.id);
        if (roomTypeIds.length > 0) {
            await prisma.roomInventory.deleteMany({ where: { roomTypeId: { in: roomTypeIds } } });
            await prisma.roomType.deleteMany({ where: { hotelId } });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < data.roomTypes.length; i++) {
            const rt = data.roomTypes[i];
            const roomImages = Array.isArray(rt.images) ? rt.images : [];
            const priceFen = Math.round((typeof rt.price === 'number' ? rt.price : 0) * 100);
            const quota = Math.max(0, typeof rt.inventory === 'number' ? rt.inventory : 0);
            const roomType = await prisma.roomType.create({
                data: {
                    hotelId,
                    name: (rt.name ?? '').trim() || `房型${i + 1}`,
                    price: priceFen,
                    bedInfo: (rt.bedInfo ?? '').trim() || '',
                    images: roomImages,
                    salesVolume: 0,
                    sortOrder: i,
                },
            });
            const inventoryRows = Array.from({ length: 365 }, (_, d) => {
                const date = new Date(today);
                date.setDate(date.getDate() + d);
                return { roomTypeId: roomType.id, date, price: priceFen, quota };
            });
            await prisma.roomInventory.createMany({ data: inventoryRows });
        }

        return res.status(200).json({
            code: 200,
            message: '已保存，请等待审核',
            data: null,
        });
    } catch (err) {
        console.error('updateHotel Error:', err);
        return res.status(500).json({ code: 500, message: '更新失败', data: null });
    }
};

/** 酒店列表：商户看自己的，管理员看全部；支持按名称、审核状态、在线状态筛选 */
export const getHotelList = async (req: ManagerRequest, res: Response) => {
    try {
        const { managerRole: role, managerId } = req;
        const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
        const checkingParam = req.query.checking;
        const checking = typeof checkingParam === 'string' && ['PENDING', 'PUBLISHED', 'REJECTED', 'DRAFT'].includes(checkingParam)
            ? checkingParam
            : undefined;
        const statusParam = req.query.status;
        const status = statusParam === '0' ? 0 : statusParam === '1' ? 1 : undefined;

        const where: {
            ownerId?: number;
            name?: { contains: string; mode: 'insensitive' };
            checking?: ReviewProcess;
            status?: number;
        } = {};
        if (role === 'MERCHANT') {
            where.ownerId = managerId;
        }
        if (name) {
            where.name = { contains: name, mode: 'insensitive' };
        }
        if (checking) {
            where.checking = checking as ReviewProcess;
        }
        if (status !== undefined) {
            where.status = status;
        }

        const list = await prisma.hotel.findMany({
            where,
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                checking: true,
                status: true,
                ownerId: true,
            },
            orderBy: { id: 'desc' },
        });

        return res.status(200).json({
            code: 200,
            message: 'success',
            data: list,
        });
    } catch (err) {
        console.error('getHotelList Error:', err);
        return res.status(500).json({ code: 500, message: '获取列表失败', data: null });
    }
};

/** 工作台统计：商户返回名下在线/审核中/被拒绝数，管理员返回商店总数/待审核数 */
export const getDashboardStats = async (req: ManagerRequest, res: Response) => {
    try {
        const { managerRole: role, managerId } = req;

        if (role === 'MERCHANT') {
            const [onlineCount, pendingCount, rejectedCount] = await Promise.all([
                prisma.hotel.count({ where: { ownerId: managerId, status: 1, checking: ReviewProcess.PUBLISHED } }),
                prisma.hotel.count({ where: { ownerId: managerId, checking: ReviewProcess.PENDING } }),
                prisma.hotel.count({ where: { ownerId: managerId, checking: ReviewProcess.REJECTED } }),
            ]);
            return res.status(200).json({
                code: 200,
                message: 'success',
                data: { onlineCount, pendingCount, rejectedCount },
            });
        }

        const [totalCount, pendingCount] = await Promise.all([
            prisma.hotel.count(),
            prisma.hotel.count({ where: { checking: ReviewProcess.PENDING } }),
        ]);
        return res.status(200).json({
            code: 200,
            message: 'success',
            data: { totalCount, pendingCount },
        });
    } catch (err) {
        console.error('getDashboardStats Error:', err);
        return res.status(500).json({ code: 500, message: '获取统计失败', data: null });
    }
};

/** 管理员审核：通过或拒绝 */
export const auditHotel = async (req: ManagerRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const hotelId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam ?? '', 10);
        if (!Number.isFinite(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }
        const body = req.body as { action?: string; adminNote?: string };
        const action = body.action === 'APPROVE' ? 'APPROVE' : body.action === 'REJECT' ? 'REJECT' : null;
        if (!action) {
            return res.status(400).json({ code: 400, message: '请传 action: APPROVE 或 REJECT', data: null });
        }
        const adminNoteRaw = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';
        if (action === 'REJECT' && !adminNoteRaw) {
            return res.status(400).json({ code: 400, message: '拒绝时审核意见为必填项', data: null });
        }

        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }
        if (hotel.checking === ReviewProcess.PUBLISHED) {
            return res.status(400).json({ code: 400, message: '已发布酒店不可再审核', data: null });
        }

        const checking = action === 'APPROVE' ? ReviewProcess.PUBLISHED : ReviewProcess.REJECTED;
        const adminNote = action === 'REJECT' ? adminNoteRaw : null;

        await prisma.hotel.update({
            where: { id: hotelId },
            data: { checking, adminNote },
        });

        return res.status(200).json({
            code: 200,
            message: action === 'APPROVE' ? '已通过' : '已拒绝',
            data: null,
        });
    } catch (err) {
        console.error('auditHotel Error:', err);
        return res.status(500).json({ code: 500, message: '审核操作失败', data: null });
    }
};

/** 管理员下线：仅当 status=1 且 checking=PUBLISHED 时可下线 */
export const setHotelOffline = async (req: ManagerRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const hotelId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam ?? '', 10);
        if (!Number.isFinite(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }

        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }
        if (hotel.status !== 1 || hotel.checking !== ReviewProcess.PUBLISHED) {
            return res.status(400).json({ code: 400, message: '仅已发布且在线的酒店可下线', data: null });
        }

        await prisma.hotel.update({
            where: { id: hotelId },
            data: { status: 0, checking: ReviewProcess.PENDING },
        });

        return res.status(200).json({ code: 200, message: '已下线', data: null });
    } catch (err) {
        console.error('setHotelOffline Error:', err);
        return res.status(500).json({ code: 500, message: '下线失败', data: null });
    }
};

/** 管理员上线：将 status 设为 1，并将审核状态设为 PENDING 待审核 */
export const setHotelOnline = async (req: ManagerRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const hotelId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam ?? '', 10);
        if (!Number.isFinite(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }

        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }
        if (hotel.status !== 0) {
            return res.status(400).json({ code: 400, message: '仅已下线的酒店可上线', data: null });
        }

        await prisma.hotel.update({
            where: { id: hotelId },
            data: { status: 1, checking: ReviewProcess.PENDING },
        });

        return res.status(200).json({ code: 200, message: '已上线，请审核', data: null });
    } catch (err) {
        console.error('setHotelOnline Error:', err);
        return res.status(500).json({ code: 500, message: '上线失败', data: null });
    }
};
