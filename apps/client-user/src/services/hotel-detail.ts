import { httpClient } from '@/lib/http';
import type {HotelVo} from "@/services/hotel-search.ts";

//房型类型接口
export interface RoomTypeVo {
    id: number;
    name: string;
    price: number; // 分
    bedInfo: string;
    images: string[];
    salesVolume: number;
}
export interface HotelDetailVo extends HotelVo {
    description?: string;
    images: string[];
    roomTypes: RoomTypeVo[];
}

//获取酒店详情api
export const getHotelDetailApi = (id: string) => {
    return httpClient.get<HotelDetailVo>(`/hotel/${id}`);
};