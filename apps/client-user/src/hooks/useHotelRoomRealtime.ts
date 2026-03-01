import { useEffect, useRef } from 'react';
import {
    createHotelRoomRealtimeEventSource,
    type RoomRealtimeSnapshotEvent,
    type RoomRealtimeUpdateEvent,
} from '@/services/hotel-detail';

interface UseHotelRoomRealtimeOptions {
    hotelId?: string;
    checkIn: string;
    checkOut: string;
    enabled?: boolean;
    reconnectDelayMs?: number;
    onSnapshot: (rooms: RoomRealtimeUpdateEvent[]) => void;
    onRoomUpdate: (update: RoomRealtimeUpdateEvent) => void;
    onConnectionChange?: (connected: boolean) => void;
}

export const useHotelRoomRealtime = ({
    hotelId,
    checkIn,
    checkOut,
    enabled = true,
    reconnectDelayMs = 3000,
    onSnapshot,
    onRoomUpdate,
    onConnectionChange,
}: UseHotelRoomRealtimeOptions) => {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const closedByUserRef = useRef(false);

    useEffect(() => {
        if (!enabled || !hotelId || !checkIn || !checkOut) return;

        closedByUserRef.current = false;

        const clearReconnectTimer = () => {
            if (reconnectTimerRef.current != null) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };

        const cleanupEventSource = () => {
            if (!eventSourceRef.current) return;
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        };

        const connect = () => {
            clearReconnectTimer();
            cleanupEventSource();

            const es = createHotelRoomRealtimeEventSource(hotelId, checkIn, checkOut);
            eventSourceRef.current = es;

            es.onopen = () => {
                onConnectionChange?.(true);
            };

            es.addEventListener('snapshot', (event) => {
                try {
                    const payload = JSON.parse((event as MessageEvent<string>).data) as RoomRealtimeSnapshotEvent;
                    if (!Array.isArray(payload.rooms)) return;
                    onSnapshot(payload.rooms);
                } catch {
                    // ignore malformed payload
                }
            });

            es.addEventListener('room_update', (event) => {
                try {
                    const payload = JSON.parse((event as MessageEvent<string>).data) as RoomRealtimeUpdateEvent;
                    if (!payload || typeof payload.roomTypeId !== 'number') return;
                    onRoomUpdate(payload);
                } catch {
                    // ignore malformed payload
                }
            });

            es.onerror = () => {
                onConnectionChange?.(false);
                cleanupEventSource();
                if (closedByUserRef.current) return;

                reconnectTimerRef.current = window.setTimeout(() => {
                    connect();
                }, reconnectDelayMs);
            };
        };

        connect();

        return () => {
            closedByUserRef.current = true;
            onConnectionChange?.(false);
            clearReconnectTimer();
            cleanupEventSource();
        };
    }, [enabled, hotelId, checkIn, checkOut, reconnectDelayMs, onSnapshot, onRoomUpdate, onConnectionChange]);
};
