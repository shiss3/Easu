import { Request, Response } from 'express';
import { prisma } from '@repo/database'; // 直接使用 workspace 中的单例

export const searchHotels = async (req: Request, res: Response) => {
    try {
        const { city, checkIn, checkOut } = req.body;

        // 1. 构建查询条件 (此处仅为示例，实际需处理日期空置等)
        const whereClause: any = {
            status: 1, // 只查上架的
        };

        if (city) {
            whereClause.city = { contains: city };
        }

        // 2. Prisma 查询：查酒店同时查出最便宜的一个房型价格
        const hotels = await prisma.hotel.findMany({
            where: whereClause,
            include: {
                roomTypes: {
                    select: { price: true },
                    orderBy: { price: 'asc' }, // 按价格升序
                    take: 1, // 只取第一个（最低价）
                },
            },
            orderBy: {
                sortOrder: 'asc', // 竞价排名
            },
        });

        // 3. 数据格式化：将嵌套的 roomTypes[0].price 提出来变成 minPrice
        const formattedHotels = hotels.map((hotel) => {
            const minPrice = hotel.roomTypes.length > 0 ? hotel.roomTypes[0].price : 0;
            // 移除 roomTypes，保持返回数据干净
            const { roomTypes, ...hotelData } = hotel;
            return {
                ...hotelData,
                minPrice,
            };
        });

        // 4. 返回标准结构
        res.json({
            code: 200,
            message: '查询成功',
            data: formattedHotels,
            meta: {
                total: formattedHotels.length,
            },
        });

    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            data: null,
        });
    }
};