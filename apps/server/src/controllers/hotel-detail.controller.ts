import { Request, Response } from 'express';
import { prisma } from '@repo/database';

export const getHotelDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const hotelId = parseInt(id as string, 10);

        if (isNaN(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }

        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: {
                // 关联查询房型，并按价格升序排列
                roomTypes: {
                    orderBy: { price: 'asc' },
                    where: {
                        // 可以在这里加库存过滤，暂时展示所有
                    }
                },
            },
        });

        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }

        // 可以在这里处理 tags 字符串数组转对象等逻辑，或者留给前端
        res.json({
            code: 200,
            message: '查询成功',
            data: hotel,
        });

    } catch (error) {
        console.error('Detail Error:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
};