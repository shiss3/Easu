import { httpClient } from '@/lib/http';

export interface HomeBannerDto {
    id: number;
    hotelId: number;
    imageUrl: string;
    title: string;
    subTitle?: string | null;
    linkUrl: string;
    trackCode?: string | null;
}

export interface GetHomeBannersParams {
    city?: string;
    limit?: number;
}

export const getHomeBannersApi = (params: GetHomeBannersParams) => {
    return httpClient.get<HomeBannerDto[]>('/home/banners', { params });
};

