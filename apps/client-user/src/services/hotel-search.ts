import { httpClient } from '@/lib/http';

export interface HotelSearchParams {
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
    stars?: number[];
    searchType?: 'hotel' | 'hourly';
    cursor?: number;
    limit?: number;
}

export interface HotelVo {
    id: number;
    name: string;
    address: string;
    score: number;
    star: number;
    reviewCount: number;
    coverImage: string;
    tags: string[];
    minPrice: number;
    isFallback?: boolean;
}

export interface SearchResponse {
    exactMatches: HotelVo[];
    recommendations: HotelVo[];
    nextCursor: number | null;
    total: number;
}

function cleanSearchParams(raw: HotelSearchParams): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        if (typeof v === 'number' && !Number.isFinite(v)) continue;
        out[k] = v;
    }
    return out;
}

export const searchHotelsApi = (params: HotelSearchParams) => {
    return httpClient.post<SearchResponse>('/hotel/search', cleanSearchParams(params));
};

export interface SuggestionItem {
    type: 'CITY' | 'HOTEL';
    id: string | number;
    name: string;
    city: string;
    address?: string;
    tags?: string[];
    score?: number;
    reviewCount?: number;
    minPrice?: number;
}

export const getSearchSuggestionsApi = (keyword: string, city?: string) => {
    return httpClient.get<SuggestionItem[]>('/search/suggestions', {
        params: { keyword, ...(city ? { city } : {}) },
    });
};