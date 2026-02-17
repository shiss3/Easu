import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HomeBannerDto } from '@/services/home';
import { getCitiesApi, type CitiesData } from '@/services/city';
import { getRegeoLocationApi, type RegeoLocationData } from '@/services/location';
import type { Coords, LocateStatus } from '@/store/searchStore';
import { useSearchStore } from '@/store/searchStore';

const CITY_SUFFIX_REG = /(市|省|自治区|特别行政区)$/g;

export type GeoErrorCategory =
    | 'permission_denied'
    | 'timeout'
    | 'not_supported'
    | 'geocode_failed';

export interface GeoLocationError {
    category: GeoErrorCategory;
    message: string;
    cause?: unknown;
}

export interface NormalizedLocation {
    city: string;
    coords: Coords;
    district?: string;
    addressHint: string;
    raw: RegeoLocationData;
}

const normalizeCityName = (city: string) => city.replace(CITY_SUFFIX_REG, '').trim() || '上海';

const GEO_PERMISSION_DENIED = 1;
const GEO_TIMEOUT = 3;

const toGeoError = (error: unknown): GeoLocationError => {
    const maybeGeoError = error as { code?: number; message?: string } | null;
    const code = maybeGeoError?.code;
    if (code === GEO_PERMISSION_DENIED) {
        return { category: 'permission_denied', message: '定位权限被拒绝', cause: error };
    }
    if (code === GEO_TIMEOUT) {
        return { category: 'timeout', message: '定位超时，请重试', cause: error };
    }
    return {
        category: 'geocode_failed',
        message: maybeGeoError?.message || '定位失败，请手动选择城市',
        cause: error,
    };
};

export const useBanners = (city: string) => {
    return useQuery({
        queryKey: ['home', 'banners', { city }],
        enabled: Boolean(city.trim()),
        staleTime: 1000 * 60 * 4,
        queryFn: async ({ signal }) => {
            // 透传 signal，支持城市切换时取消旧请求，避免竞态覆盖。
            const response = await httpClient.get<HomeBannerDto[]>('/home/banners', {
                params: { city: city.trim(), limit: 4 },
                signal,
            });
            return response.data ?? [];
        },
    });
};

export const useCityList = () => {
    return useQuery({
        queryKey: ['home', 'city-list'],
        staleTime: 1000 * 60 * 60 * 24,
        queryFn: async () => {
            const response = await getCitiesApi();
            return response.data as CitiesData;
        },
    });
};

export const useGeoLocation = () => {
    const status = useSearchStore((state) => state.locatingStatus);
    const setLocatingStatus = useSearchStore((state) => state.setLocatingStatus);
    const setCoords = useSearchStore((state) => state.setCoords);
    const setCity = useSearchStore((state) => state.setCity);
    const setLocationMeta = useSearchStore((state) => state.setLocationMeta);
    const [location, setLocation] = useState<NormalizedLocation | null>(null);
    const [error, setError] = useState<GeoLocationError | null>(null);

    const trigger = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocatingStatus('error');
            setError({ category: 'not_supported', message: '当前浏览器不支持定位' });
            return null;
        }

        setError(null);
        setLocatingStatus('locating');

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const nextCoords: Coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            setLocatingStatus('geocoding');
            const regeoRes = await getRegeoLocationApi(nextCoords);
            const city = normalizeCityName(regeoRes.data.city || '上海');
            const locationLabel = regeoRes.data.poiName
                ? `${regeoRes.data.poiName}附近`
                : (regeoRes.data.formattedAddress || city);

            const normalized: NormalizedLocation = {
                city,
                coords: nextCoords,
                district: regeoRes.data.district,
                addressHint: locationLabel,
                raw: regeoRes.data,
            };

            setCoords(nextCoords);
            setCity(city);
            setLocationMeta({
                locationLabel,
                locationPoiName: regeoRes.data.poiName ?? undefined,
                locationFormattedAddress: regeoRes.data.formattedAddress ?? undefined,
                lastLocateAt: Date.now(),
            });
            setLocation(normalized);
            setLocatingStatus('success');
            return normalized;
        } catch (e) {
            const nextError = toGeoError(e);

            setLocatingStatus('error');
            setError(nextError);
            return null;
        }
    }, [setCity, setCoords, setLocatingStatus, setLocationMeta]);

    const reset = useCallback(() => {
        setLocation(null);
        setError(null);
        setCoords(null);
        setLocatingStatus('idle');
    }, [setCoords, setLocatingStatus]);

    return {
        location,
        status: status as LocateStatus,
        error,
        trigger,
        reset,
    };
};

