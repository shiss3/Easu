import type { Request, Response } from 'express';
import { prisma, Prisma } from '@repo/database';

export interface HomeBannerDto {
    id: number;
    hotelId: number;
    imageUrl: string;
    title: string;
    subTitle?: string | null;
    linkUrl: string;
    trackCode?: string | null;
}

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
};

const normalizeCity = (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const buildValidTimeWhere = (now: Date) =>
    ({
        AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
    }) satisfies Prisma.HomeBannerWhereInput;

// GET /api/home/banners?city=上海&limit=4
export const getBanners = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const city = normalizeCity(req.query.city);
        const limit = clampInt(req.query.limit, 4, 1, 20);

        const selected: HomeBannerDto[] = [];
        const selectedHotelIds = new Set<number>();
        const validTimeWhere = buildValidTimeWhere(now);

        const toDtoFromBanner = (banner: {
            id: number;
            hotelId: number;
            title: string | null;
            subTitle: string | null;
            imageUrlOverride: string | null;
            trackCode: string | null;
            hotel: { name: string; coverImage: string };
        }): HomeBannerDto | null => {
            const imageUrl = banner.imageUrlOverride || banner.hotel.coverImage;
            if (!imageUrl) return null;
            return {
                id: banner.id,
                hotelId: banner.hotelId,
                imageUrl,
                title: banner.title || banner.hotel.name,
                subTitle: banner.subTitle,
                linkUrl: `/hotel/${banner.hotelId}`,
                trackCode: banner.trackCode,
            };
        };

        // Step 1: 定向投放（高优先级）
        if (city) {
            const targeted = await prisma.homeBanner.findMany({
                where: {
                    targetCity: city,
                    status: 1,
                    ...validTimeWhere,
                },
                orderBy: { sortOrder: 'asc' },
                take: limit,
                include: {
                    hotel: { select: { name: true, coverImage: true } },
                },
            });

            for (const b of targeted) {
                if (selected.length >= limit) break;
                if (selectedHotelIds.has(b.hotelId)) continue;
                const dto = toDtoFromBanner(b);
                if (!dto) continue;
                selected.push(dto);
                selectedHotelIds.add(b.hotelId);
            }
        }

        // Step 2: 全国通投（中优先级）
        if (selected.length < limit) {
            const remaining = limit - selected.length;
            const excludeIds = Array.from(selectedHotelIds);

            const nationwide = await prisma.homeBanner.findMany({
                where: {
                    targetCity: null,
                    status: 1,
                    ...(excludeIds.length > 0 ? { hotelId: { notIn: excludeIds } } : {}),
                    ...validTimeWhere,
                },
                orderBy: { sortOrder: 'asc' },
                take: remaining,
                include: {
                    hotel: { select: { name: true, coverImage: true } },
                },
            });

            for (const b of nationwide) {
                if (selected.length >= limit) break;
                if (selectedHotelIds.has(b.hotelId)) continue;
                const dto = toDtoFromBanner(b);
                if (!dto) continue;
                selected.push(dto);
                selectedHotelIds.add(b.hotelId);
            }
        }

        // Step 3: 算法兜底（低优先级）
        if (selected.length < limit) {
            const remaining = limit - selected.length;
            const excludeIds = Array.from(selectedHotelIds);

            const hotels = await prisma.hotel.findMany({
                where: {
                    status: 1,
                    ...(city ? { city } : {}),
                    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
                    // Prisma 中 coverImage 为必填，但仍做兜底过滤：必须有值且非空字符串
                    coverImage: { not: '' },
                },
                select: {
                    id: true,
                    name: true,
                    coverImage: true,
                    score: true,
                    reviewCount: true,
                },
                orderBy: [{ score: 'desc' }, { reviewCount: 'desc' }],
                take: remaining,
            });

            for (const h of hotels) {
                if (selected.length >= limit) break;
                if (!h.coverImage) continue;
                selected.push({
                    // 兜底数据没有 HomeBanner.id，使用负数避免与自增主键冲突
                    id: -h.id,
                    hotelId: h.id,
                    imageUrl: h.coverImage,
                    title: h.name,
                    subTitle: `评分${h.score} · ${h.reviewCount}点评`,
                    linkUrl: `/hotel/${h.id}`,
                    trackCode: null,
                });
                selectedHotelIds.add(h.id);
            }
        }

        res.json({
            code: 200,
            message: '查询成功',
            data: selected,
            meta: {
                total: selected.length,
            },
        });
    } catch (error) {
        console.error('GetBanners Error:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            data: null,
        });
    }
};

