import type { Response } from 'express';

export interface RoomRealtimeUpdateEvent {
    eventId: string;
    hotelId: number;
    roomTypeId: number;
    price: number;
    quota: number;
    checkIn: string;
    checkOut: string;
    updatedAt: string;
}

type Subscriber = {
    id: string;
    res: Response;
};

type GroupKey = `${number}|${string}|${string}`;

const groups = new Map<GroupKey, Map<string, Subscriber>>();

const createGroupKey = (hotelId: number, checkIn: string, checkOut: string): GroupKey =>
    `${hotelId}|${checkIn}|${checkOut}`;

const parseGroupKey = (key: string) => {
    const [hotelIdRaw, checkIn, checkOut] = key.split('|');
    const hotelId = Number(hotelIdRaw);
    if (!Number.isFinite(hotelId) || !checkIn || !checkOut) return null;
    return { hotelId, checkIn, checkOut };
};

const writeSseEvent = (res: Response, event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
    }
};

export const roomRealtimeHub = {
    subscribe(hotelId: number, checkIn: string, checkOut: string, res: Response) {
        const key = createGroupKey(hotelId, checkIn, checkOut);
        const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const subscriber: Subscriber = { id: clientId, res };

        let group = groups.get(key);
        if (!group) {
            group = new Map<string, Subscriber>();
            groups.set(key, group);
        }
        group.set(clientId, subscriber);

        const unsubscribe = () => {
            const current = groups.get(key);
            if (!current) return;
            current.delete(clientId);
            if (current.size === 0) groups.delete(key);
        };

        return { clientId, key, unsubscribe };
    },

    broadcastSnapshot(hotelId: number, checkIn: string, checkOut: string, updates: RoomRealtimeUpdateEvent[]) {
        const key = createGroupKey(hotelId, checkIn, checkOut);
        const group = groups.get(key);
        if (!group || group.size === 0) return;

        const payload = { hotelId, checkIn, checkOut, rooms: updates };
        for (const subscriber of group.values()) {
            writeSseEvent(subscriber.res, 'snapshot', payload);
        }
    },

    broadcastRoomUpdate(update: RoomRealtimeUpdateEvent) {
        const key = createGroupKey(update.hotelId, update.checkIn, update.checkOut);
        const group = groups.get(key);
        if (!group || group.size === 0) return;

        for (const subscriber of group.values()) {
            writeSseEvent(subscriber.res, 'room_update', update);
        }
    },

    broadcastPing(hotelId: number, checkIn: string, checkOut: string) {
        const key = createGroupKey(hotelId, checkIn, checkOut);
        const group = groups.get(key);
        if (!group || group.size === 0) return;

        const payload = { ts: Date.now() };
        for (const subscriber of group.values()) {
            writeSseEvent(subscriber.res, 'ping', payload);
        }
    },

    getActiveDateRangesByHotel(hotelId: number) {
        const result: Array<{ checkIn: string; checkOut: string }> = [];
        for (const key of groups.keys()) {
            const parsed = parseGroupKey(key);
            if (!parsed || parsed.hotelId !== hotelId) continue;
            result.push({ checkIn: parsed.checkIn, checkOut: parsed.checkOut });
        }
        return result;
    },
};
