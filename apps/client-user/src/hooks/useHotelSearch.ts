import { useInfiniteQuery } from '@tanstack/react-query';
import {
    searchHotelsApi,
    type HotelSearchParams,
    type SearchResponse,
    type HotelVo,
} from '@/services/hotel-search';

export interface UseHotelSearchParams {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guestCount?: number;
    rooms?: number;
    hasWindow?: boolean;
    hasBreakfast?: boolean;
    childrenFriendly?: boolean;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    tags?: string[];
}

const PAGE_SIZE = 20;

function cleanParams(raw: UseHotelSearchParams): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        if (typeof v === 'number' && !Number.isFinite(v)) continue;
        if (Array.isArray(v) && v.length === 0) continue;
        out[k] = v;
    }
    return out;
}

export function useHotelSearch(params: UseHotelSearchParams) {
    const query = useInfiniteQuery<SearchResponse, Error>({
        queryKey: ['hotelSearch', params],
        queryFn: async ({ pageParam }) => {
            const body: HotelSearchParams = {
                ...cleanParams(params) as HotelSearchParams,
                cursor: pageParam as number,
                limit: PAGE_SIZE,
            };
            const res = await searchHotelsApi(body);
            return (res as any).data as SearchResponse;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const allHotels: HotelVo[] = query.data
        ? query.data.pages.flatMap((page) => [
            ...page.exactMatches,
            ...page.recommendations,
        ])
        : [];

    return {
        ...query,
        allHotels,
    };
}
