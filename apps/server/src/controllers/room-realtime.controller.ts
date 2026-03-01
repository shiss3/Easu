import type { Request, Response } from 'express';
import dayjs from 'dayjs';
import { prisma, ReviewProcess } from '@repo/database';
import { getHotelRoomSnapshot } from '../services/room-realtime.service';
import { roomRealtimeHub } from '../services/room-realtime-hub';

const HEARTBEAT_MS = 25000;
const writeSseEvent = (res: Response, event: string, data: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
    }
};

export const streamHotelRoomRealtime = async (req: Request, res: Response) => {
    const hotelId = Number(req.params.hotelId);
    const checkIn = typeof req.query.checkIn === 'string' ? req.query.checkIn : '';
    const checkOut = typeof req.query.checkOut === 'string' ? req.query.checkOut : '';

    if (!Number.isFinite(hotelId)) {
        return res.status(400).json({ code: 400, message: '无效的酒店ID', data: null });
    }
    if (!dayjs(checkIn, 'YYYY-MM-DD', true).isValid() || !dayjs(checkOut, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ code: 400, message: '日期格式错误', data: null });
    }
    if (!dayjs(checkOut).isAfter(dayjs(checkIn), 'day')) {
        return res.status(400).json({ code: 400, message: '日期范围无效', data: null });
    }

    const hotel = await prisma.hotel.findFirst({
        where: {
            id: hotelId,
            status: 1,
            checking: ReviewProcess.PUBLISHED,
        },
        select: { id: true },
    });
    if (!hotel) {
        return res.status(404).json({ code: 404, message: '酒店不存在或未上线', data: null });
    }

    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const { unsubscribe } = roomRealtimeHub.subscribe(hotelId, checkIn, checkOut, res);

    try {
        const snapshot = await getHotelRoomSnapshot(hotelId, checkIn, checkOut);
        writeSseEvent(res, 'snapshot', { hotelId, checkIn, checkOut, rooms: snapshot });
    } catch (error) {
        console.error('Room realtime snapshot error:', error);
    }

    const heartbeat = setInterval(() => {
        writeSseEvent(res, 'ping', { ts: Date.now() });
    }, HEARTBEAT_MS);

    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
};
