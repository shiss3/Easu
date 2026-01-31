import { httpClient } from '@/lib/http';

export interface HotelSearchParams {
    city?: string;
    checkIn?: string;
    checkOut?: string;
}

// 定义返回的数据类型 (根据后端返回)
export interface HotelVo {
    id: number;
    name: string;
    address: string;
    score: number;
    reviewCount: number;
    coverImage: string;
    tags: string[];
    minPrice: number; // 后端计算出的最低价
}

export const searchHotelsApi = (params: HotelSearchParams) => {
    return httpClient.post<HotelVo[]>('/hotel/search', params);
};