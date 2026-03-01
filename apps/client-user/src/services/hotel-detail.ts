import { httpClient } from '@/lib/http';
import type {HotelVo} from "@/services/hotel-search.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

//房型类型接口
export interface RoomTypeVo {
    id: number;
    name: string;
    price: number; // 元
    bedInfo: string;
    images: string[];
    salesVolume: number;
    hasBreakfast?: boolean;
    hasWindow?: boolean;
    tags?: string[];
    capacity?: number;
    quota?: number;
}
export interface HotelDetailVo extends HotelVo {
    description?: string;
    images: string[];
    roomTypes: RoomTypeVo[];
}

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

export interface RoomRealtimeSnapshotEvent {
    hotelId: number;
    checkIn: string;
    checkOut: string;
    rooms: RoomRealtimeUpdateEvent[];
}

//获取酒店详情api
export const getHotelDetailApi = (id: string, checkIn?: string, checkOut?: string) => {
    return httpClient.get<HotelDetailVo>(`/hotel/${id}`, {
        params: {
            ...(checkIn ? { checkIn } : {}),
            ...(checkOut ? { checkOut } : {}),
        },
    });
};

export const bookRoomApi = (roomId: number, checkIn: string, checkOut: string) => {
    return httpClient.post<void>(`/room/${roomId}/book`, { checkIn, checkOut });
};

export const createHotelRoomRealtimeEventSource = (hotelId: string, checkIn: string, checkOut: string) => {
    const params = new URLSearchParams({ checkIn, checkOut });
    const url = `${API_BASE}/realtime/hotel/${hotelId}/rooms?${params.toString()}`;
    return new EventSource(url);
};