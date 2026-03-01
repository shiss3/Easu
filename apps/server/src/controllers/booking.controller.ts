import { Request, Response } from 'express';
import { prisma, ReviewProcess } from '@repo/database';
import dayjs from 'dayjs';
import { publishRoomRangeUpdate } from '../services/room-realtime.service';

export const bookRoom = async (req: Request, res: Response) => {
    try {
        const { roomTypeId } = req.params;
        const rtId = parseInt(roomTypeId as string, 10);
        const { checkIn, checkOut } = req.body;

        if (isNaN(rtId)) {
            return res.status(400).json({ code: 400, message: '无效的房型ID', data: null });
        }

        if (!checkIn || !checkOut) {
            return res.status(400).json({ code: 400, message: '请提供入住和离店日期', data: null });
        }

        const checkInDate = dayjs(checkIn).startOf('day');
        const checkOutDate = dayjs(checkOut).startOf('day');
        const nightCount = checkOutDate.diff(checkInDate, 'day');

        if (nightCount <= 0) {
            return res.status(400).json({ code: 400, message: '日期范围无效', data: null });
        }

        const roomType = await prisma.roomType.findFirst({
            where: {
                id: rtId,
                hotel: {
                    status: 1,
                    checking: ReviewProcess.PUBLISHED,
                },
            },
            select: { id: true, hotelId: true },
        });
        if (!roomType) {
            return res.status(404).json({ code: 404, message: '房型不存在或酒店未上线', data: null });
        }

        await prisma.$transaction(async (tx) => {
            const inventories = await tx.roomInventory.findMany({
                where: {
                    roomTypeId: rtId,
                    date: { gte: checkInDate.toDate(), lt: checkOutDate.toDate() },
                },
            });

            if (inventories.length < nightCount) {
                throw new Error('部分日期无库存记录');
            }

            const noQuota = inventories.find((inv) => inv.quota <= 0);
            if (noQuota) {
                throw new Error('所选日期库存不足');
            }

            for (const inv of inventories) {
                await tx.roomInventory.update({
                    where: { id: inv.id },
                    data: { quota: { decrement: 1 } },
                });
            }
        });

        publishRoomRangeUpdate(roomType.hotelId, rtId, checkInDate.format('YYYY-MM-DD'), checkOutDate.format('YYYY-MM-DD'))
            .catch((error) => {
                console.error('Publish booking realtime update error:', error);
            });

        res.json({ code: 200, message: '预订成功', data: null });
    } catch (error: any) {
        console.error('Booking Error:', error);
        const msg = error.message === '部分日期无库存记录' || error.message === '所选日期库存不足'
            ? error.message
            : '预订失败';
        res.status(400).json({ code: 400, message: msg, data: null });
    }
};
