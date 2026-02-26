import { httpClient } from '@/lib/http';
import type {HotelVo} from "@/services/hotel-search.ts";

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