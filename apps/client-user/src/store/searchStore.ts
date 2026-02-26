import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

dayjs.extend(customParseFormat);

const SEARCH_STORAGE_KEY = 'search-storage';
const DATE_FORMAT = 'YYYY-MM-DD';

export interface Coords {
    lat: number;
    lng: number;
}

export type DateString = `${number}-${number}-${number}`;

export interface DateRange {
    start: DateString;
    end: DateString;
}

export interface SearchFilters {
    minPrice?: number | null;
    maxPrice?: number | null;
    stars?: string[];
}

export type LocateStatus = 'idle' | 'locating' | 'geocoding' | 'success' | 'error';
export type SearchType = 'hotel' | 'hourly';
export interface LocationMetaPayload {
    locationLabel: string;
    locationPoiName?: string;
    locationFormattedAddress?: string;
    lastLocateAt?: number;
}

interface SearchState {
    city: string;
    coords: Coords | null;
    locationLabel: string;
    locationPoiName?: string;
    locationFormattedAddress?: string;
    lastLocateAt?: number;
    dateRange: DateRange;
    filters: SearchFilters;
    searchType: SearchType;
    keyword: string;
    locatingStatus: LocateStatus;
    setCity: (city: string) => void;
    setDateRange: (range: DateRange) => void;
    setCoords: (coords: Coords | null) => void;
    setLocationMeta: (payload: LocationMetaPayload) => void;
    clearLocationMeta: () => void;
    setFilters: (next: Partial<SearchFilters>) => void;
    resetFilters: () => void;
    setSearchType: (type: SearchType) => void;
    setKeyword: (keyword: string) => void;
    setLocatingStatus: (status: LocateStatus) => void;
    hydrateFromUrl: (params: URLSearchParams) => void;
    hydrateFromStorage: () => void;
}

const DEFAULT_CITY = '上海';
const DEFAULT_SEARCH_TYPE: SearchType = 'hotel';
const DEFAULT_LOCATION_LABEL = '';
const DEFAULT_FILTERS: SearchFilters = {
    minPrice: undefined,
    maxPrice: undefined,
    stars: undefined,
};

const toDateString = (value: dayjs.Dayjs): DateString => value.format(DATE_FORMAT) as DateString;

const getDefaultDateRange = (): DateRange => {
    const today = dayjs().startOf('day');
    return {
        start: toDateString(today),
        end: toDateString(today.add(1, 'day')),
    };
};

const parseDate = (raw: unknown) => {
    if (typeof raw !== 'string') {
        return null;
    }
    const parsed = dayjs(raw, DATE_FORMAT, true);
    return parsed.isValid() ? parsed.startOf('day') : null;
};

const normalizeDateRange = (
    rawRange: Partial<{ start: string; end: string }> | null | undefined
): DateRange => {
    const fallback = getDefaultDateRange();
    const today = dayjs().startOf('day');

    const start = parseDate(rawRange?.start);
    const end = parseDate(rawRange?.end);

    // Hydration rule #3: 任意解析失败都回退到 today/tomorrow
    if (!start || !end) {
        return fallback;
    }

    // Hydration rule #1: start 不能早于今天
    const safeStart = start.isBefore(today, 'day') ? today : start;
    // Hydration rule #2: end 必须大于 start
    const safeEnd = end.isAfter(safeStart, 'day') ? end : safeStart.add(1, 'day');

    return {
        start: toDateString(safeStart),
        end: toDateString(safeEnd),
    };
};

const toNumberOrNullish = (raw: string | null): number | null | undefined => {
    if (raw === null) {
        return undefined;
    }
    if (raw === '' || raw.toLowerCase() === 'null') {
        return null;
    }
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
};

const parseStars = (raw: string | null): string[] | undefined => {
    if (raw === null) {
        return undefined;
    }
    const next = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return next.length ? next : undefined;
};

const sanitizeFilters = (input: SearchFilters | null | undefined): SearchFilters => {
    if (!input) {
        return { ...DEFAULT_FILTERS };
    }

    return {
        minPrice: input.minPrice ?? undefined,
        maxPrice: input.maxPrice ?? undefined,
        stars: input.stars?.length ? input.stars : undefined,
    };
};

export const useSearchStore = create<SearchState>()(
    persist(
        (set, get) => ({
            city: DEFAULT_CITY,
            coords: null,
            locationLabel: DEFAULT_LOCATION_LABEL,
            locationPoiName: undefined,
            locationFormattedAddress: undefined,
            lastLocateAt: undefined,
            dateRange: getDefaultDateRange(),
            filters: { ...DEFAULT_FILTERS },
            searchType: DEFAULT_SEARCH_TYPE,
            keyword: '',
            locatingStatus: 'idle',
            setCity: (city) => set({ city: city.trim() || DEFAULT_CITY }),
            setDateRange: (range) => set({ dateRange: normalizeDateRange(range) }),
            setCoords: (coords) => {
                if (coords === null) {
                    set({
                        coords: null,
                        locationLabel: DEFAULT_LOCATION_LABEL,
                        locationPoiName: undefined,
                        locationFormattedAddress: undefined,
                        lastLocateAt: undefined,
                    });
                    return;
                }
                set({ coords });
            },
            setLocationMeta: (payload) =>
                set({
                    locationLabel: payload.locationLabel.trim(),
                    locationPoiName: payload.locationPoiName,
                    locationFormattedAddress: payload.locationFormattedAddress,
                    lastLocateAt: payload.lastLocateAt,
                }),
            clearLocationMeta: () =>
                set({
                    locationLabel: DEFAULT_LOCATION_LABEL,
                    locationPoiName: undefined,
                    locationFormattedAddress: undefined,
                    lastLocateAt: undefined,
                }),
            setFilters: (next) => {
                const prev = get().filters;
                const merged = { ...prev, ...next };
                set({ filters: sanitizeFilters(merged) });
            },
            resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
            setSearchType: (searchType) => set({ searchType }),
            setKeyword: (keyword) => set({ keyword }),
            setLocatingStatus: (status) => set({ locatingStatus: status }),
            hydrateFromUrl: (params) => {
                const patch: Partial<SearchState> = {};

                const city = params.get('city');
                if (city?.trim()) {
                    patch.city = city.trim();
                }

                const latRaw = params.get('lat');
                const lngRaw = params.get('lng');
                if (latRaw !== null || lngRaw !== null) {
                    const lat = Number(latRaw);
                    const lng = Number(lngRaw);
                    patch.coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
                }

                const start = params.get('start');
                const end = params.get('end');
                if (start !== null || end !== null) {
                    patch.dateRange = normalizeDateRange({
                        start: start ?? undefined,
                        end: end ?? undefined,
                    });
                }

                const hasFilterParam = params.has('minPrice') || params.has('maxPrice') || params.has('stars');
                if (hasFilterParam) {
                    const current = get().filters;
                    patch.filters = sanitizeFilters({
                        ...current,
                        minPrice: toNumberOrNullish(params.get('minPrice')),
                        maxPrice: toNumberOrNullish(params.get('maxPrice')),
                        stars: parseStars(params.get('stars')),
                    });
                }

                const searchType = params.get('searchType');
                if (searchType === 'hotel' || searchType === 'hourly') {
                    patch.searchType = searchType;
                }

                const keyword = params.get('keyword');
                if (keyword !== null) {
                    patch.keyword = keyword;
                }

                if (Object.keys(patch).length > 0) {
                    set(patch);
                }
            },
            hydrateFromStorage: () => {
                const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
                if (!raw) {
                    set({ dateRange: getDefaultDateRange() });
                    return;
                }

                try {
                    const parsed = JSON.parse(raw) as {
                        state?: Partial<
                            Pick<
                                SearchState,
                                | 'city'
                                | 'coords'
                                | 'locationLabel'
                                | 'locationPoiName'
                                | 'locationFormattedAddress'
                                | 'lastLocateAt'
                                | 'dateRange'
                                | 'filters'
                                | 'searchType'
                                | 'keyword'
                            >
                        >;
                    };
                    const fromStorage = parsed.state;
                    if (!fromStorage) {
                        set({ dateRange: getDefaultDateRange() });
                        return;
                    }

                    set({
                        city: fromStorage.city?.trim() || DEFAULT_CITY,
                        coords: fromStorage.coords ?? null,
                        locationLabel: fromStorage.locationLabel ?? DEFAULT_LOCATION_LABEL,
                        locationPoiName: fromStorage.locationPoiName ?? undefined,
                        locationFormattedAddress: fromStorage.locationFormattedAddress ?? undefined,
                        lastLocateAt: fromStorage.lastLocateAt ?? undefined,
                        dateRange: normalizeDateRange(fromStorage.dateRange),
                        filters: sanitizeFilters(fromStorage.filters),
                        searchType:
                            fromStorage.searchType === 'hourly' || fromStorage.searchType === 'hotel'
                                ? fromStorage.searchType
                                : DEFAULT_SEARCH_TYPE,
                        keyword: fromStorage.keyword ?? '',
                    });
                } catch {
                    set({
                        city: DEFAULT_CITY,
                        coords: null,
                        locationLabel: DEFAULT_LOCATION_LABEL,
                        locationPoiName: undefined,
                        locationFormattedAddress: undefined,
                        lastLocateAt: undefined,
                        dateRange: getDefaultDateRange(),
                        filters: { ...DEFAULT_FILTERS },
                        searchType: DEFAULT_SEARCH_TYPE,
                        keyword: '',
                    });
                }
            },
        }),
        {
            name: SEARCH_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                city: state.city,
                coords: state.coords,
                locationLabel: state.locationLabel,
                locationPoiName: state.locationPoiName,
                locationFormattedAddress: state.locationFormattedAddress,
                lastLocateAt: state.lastLocateAt,
                dateRange: state.dateRange,
                filters: state.filters,
                searchType: state.searchType,
                keyword: state.keyword,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    return;
                }
                state.setLocatingStatus('idle');
                state.setDateRange(state.dateRange);
                state.setFilters(state.filters);
                state.setSearchType(state.searchType === 'hourly' ? 'hourly' : 'hotel');
                if (state.coords === null) {
                    state.clearLocationMeta();
                } else {
                    state.setLocationMeta({
                        locationLabel: state.locationLabel ?? DEFAULT_LOCATION_LABEL,
                        locationPoiName: state.locationPoiName,
                        locationFormattedAddress: state.locationFormattedAddress,
                        lastLocateAt: state.lastLocateAt,
                    });
                }
            },
        }
    )
);

export const useIsLocationMode = () => useSearchStore((state) => Boolean(state.coords));

export const useNights = () =>
    useSearchStore((state) => {
        const start = dayjs(state.dateRange.start, DATE_FORMAT, true);
        const end = dayjs(state.dateRange.end, DATE_FORMAT, true);
        if (!start.isValid() || !end.isValid()) {
            return 1;
        }
        return Math.max(end.diff(start, 'day'), 1);
    });

