import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import dayjs from 'dayjs';

export const getHotelDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const hotelId = parseInt(id as string, 10);

        if (isNaN(hotelId)) {
            return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
        }

        const checkIn = req.query.checkIn as string | undefined;
        const checkOut = req.query.checkOut as string | undefined;

        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: {
                roomTypes: {
                    orderBy: { price: 'asc' },
                    include: { inventories: false },
                },
            },
        });

        if (!hotel) {
            return res.status(404).json({ code: 404, message: '酒店不存在', data: null });
        }

        const hasDateRange = checkIn && checkOut;
        const checkInDate = hasDateRange ? dayjs(checkIn).startOf('day') : null;
        const checkOutDate = hasDateRange ? dayjs(checkOut).startOf('day') : null;
        const nightCount = checkInDate && checkOutDate ? checkOutDate.diff(checkInDate, 'day') : 0;

        const toYuan = (fen: number) => Math.round(fen / 100);

        let augmentedRooms;
        if (hasDateRange && nightCount > 0) {
            const inventories = await prisma.roomInventory.findMany({
                where: {
                    roomType: { hotelId },
                    date: { gte: checkInDate!.toDate(), lt: checkOutDate!.toDate() },
                },
            });

            const invMap = new Map<number, { prices: number[]; quotas: number[]; count: number }>();
            for (const inv of inventories) {
                let entry = invMap.get(inv.roomTypeId);
                if (!entry) {
                    entry = { prices: [], quotas: [], count: 0 };
                    invMap.set(inv.roomTypeId, entry);
                }
                entry.prices.push(inv.price ?? 0);
                entry.quotas.push(inv.quota);
                entry.count++;
            }

            augmentedRooms = hotel.roomTypes.map((rt) => {
                const entry = invMap.get(rt.id);
                let quota: number;
                let priceFen: number;

                if (!entry || entry.count < nightCount) {
                    quota = 0;
                    priceFen = rt.price;
                } else {
                    quota = Math.min(...entry.quotas);
                    const validPrices = entry.prices.filter((p) => p > 0);
                    priceFen = validPrices.length > 0 ? Math.min(...validPrices) : rt.price;
                }

                return { ...rt, quota, price: toYuan(priceFen) };
            });
        } else {
            augmentedRooms = hotel.roomTypes.map((rt) => ({ ...rt, quota: 99, price: toYuan(rt.price) }));
        }

        const availableRooms = augmentedRooms.filter((r) => r.quota > 0);
        const minPrice = availableRooms.length > 0
            ? Math.min(...availableRooms.map((r) => r.price))
            : (augmentedRooms.length > 0 ? Math.min(...augmentedRooms.map((r) => r.price)) : 0);

        res.json({
            code: 200,
            message: '查询成功',
            data: { ...hotel, roomTypes: augmentedRooms, minPrice },
        });

    } catch (error) {
        console.error('Detail Error:', error);
        res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
};