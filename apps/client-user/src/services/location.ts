import { httpClient } from '@/lib/http';

export interface RegeoLocationData {
    city: string;
    formattedAddress?: string;
    poiName?: string;
    poiAddress?: string;
}

export interface RegeoLocationParams {
    lat: number;
    lng: number;
}

export const getRegeoLocationApi = (params: RegeoLocationParams) => {
    return httpClient.get<RegeoLocationData>('/location/regeo', { params });
};
