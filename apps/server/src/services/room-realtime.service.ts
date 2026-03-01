import dayjs from 'dayjs';
import { prisma } from '@repo/database';
import { roomRealtimeHub, type RoomRealtimeUpdateEvent } from './room-realtime-hub';

const toYuan = (fen: number) => Math.round(fen / 100);

const buildEvent = (payload: Omit<RoomRealtimeUpdateEvent, 'eventId' | 'updatedAt'>): RoomRealtimeUpdateEvent => ({
    ...payload,
    eventId: `${payload.hotelId}-${payload.roomTypeId}-${payload.checkIn}-${payload.checkOut}-${Date.now()}`,
    updatedAt: new Date().toISOString(),
});

const parseDateRange = (checkIn: string, checkOut: string) => {
    const checkInDate = dayjs(checkIn, 'YYYY-MM-DD', true).startOf('day');
    const checkOutDate = dayjs(checkOut, 'YYYY-MM-DD', true).startOf('day');
    const nightCount = checkOutDate.diff(checkInDate, 'day');

    if (!checkInDate.isValid() || !checkOutDate.isValid() || nightCount <= 0) {
        return null;
    }

    return { checkInDate, checkOutDate, nightCount };
};

export const getHotelRoomSnapshot = async (hotelId: number, checkIn: string, checkOut: string) => {
    const parsed = parseDateRange(checkIn, checkOut);
    if (!parsed) return [];

    const roomTypes = await prisma.roomType.findMany({
        where: { hotelId },
        select: { id: true, price: true },
        orderBy: { id: 'asc' },
    });
    if (roomTypes.length === 0) return [];

    const inventories = await prisma.roomInventory.findMany({
        where: {
            roomType: { hotelId },
            date: { gte: parsed.checkInDate.toDate(), lt: parsed.checkOutDate.toDate() },
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

    return roomTypes.map((roomType) => {
        const entry = invMap.get(roomType.id);
        let quota = 0;
        let priceFen = roomType.price;

        if (entry && entry.count >= parsed.nightCount) {
            quota = Math.min(...entry.quotas);
            const validPrices = entry.prices.filter((p) => p > 0);
            priceFen = validPrices.length > 0 ? Math.min(...validPrices) : roomType.price;
        }

        return buildEvent({
            hotelId,
            roomTypeId: roomType.id,
            checkIn,
            checkOut,
            quota,
            price: toYuan(priceFen),
        });
    });
};

export const getRoomRangeState = async (hotelId: number, roomTypeId: number, checkIn: string, checkOut: string) => {
    const parsed = parseDateRange(checkIn, checkOut);
    if (!parsed) return null;

    const roomType = await prisma.roomType.findFirst({
        where: { id: roomTypeId, hotelId },
        select: { id: true, price: true },
    });
    if (!roomType) return null;

    const inventories = await prisma.roomInventory.findMany({
        where: {
            roomTypeId,
            date: { gte: parsed.checkInDate.toDate(), lt: parsed.checkOutDate.toDate() },
        },
    });

    let quota = 0;
    let priceFen = roomType.price;

    if (inventories.length >= parsed.nightCount) {
        quota = Math.min(...inventories.map((inv) => inv.quota));
        const validPrices = inventories.map((inv) => inv.price ?? 0).filter((price) => price > 0);
        priceFen = validPrices.length > 0 ? Math.min(...validPrices) : roomType.price;
    }

    return buildEvent({
        hotelId,
        roomTypeId,
        checkIn,
        checkOut,
        quota,
        price: toYuan(priceFen),
    });
};

export const publishRoomRangeUpdate = async (hotelId: number, roomTypeId: number, checkIn: string, checkOut: string) => {
    const update = await getRoomRangeState(hotelId, roomTypeId, checkIn, checkOut);
    if (!update) return;
    roomRealtimeHub.broadcastRoomUpdate(update);
};

export const publishHotelSnapshotToActiveSubscribers = async (hotelId: number) => {
    const dateRanges = roomRealtimeHub.getActiveDateRangesByHotel(hotelId);
    if (dateRanges.length === 0) return;

    for (const range of dateRanges) {
        const snapshot = await getHotelRoomSnapshot(hotelId, range.checkIn, range.checkOut);
        roomRealtimeHub.broadcastSnapshot(hotelId, range.checkIn, range.checkOut, snapshot);
    }
};
