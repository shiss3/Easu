import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useVirtualizer } from '@tanstack/react-virtual';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import X from 'lucide-react/dist/esm/icons/x';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import type { HotelVo } from '@/services/hotel-search.ts';
import type { SortOption } from '@/components/SortSelector';
import {
    DEFAULT_GUEST_SELECTION,
    GUEST_SELECTION_STORAGE_KEY,
    normalizeGuestSelection,
    type GuestSelection,
} from '@/components/GuestSelector/types.ts';
import GuestSelectorComponent from '@/components/GuestSelector';
import { useGeoLocation } from '@/hooks/useHomeData';
import { useSearchStore, type DateRange, type DateString } from '@/store/searchStore';
import { useHotelSearch } from '@/hooks/useHotelSearch';

const CitySelector = lazy(() => import('@/components/Home/CitySelector'));
const Calendar = lazy(() => import('@/components/Calendar'));
const PriceStarSelector = lazy(() => import('@/components/Home/PriceStarSelector'));
const SortSelector = lazy(() => import('@/components/SortSelector'));
const FilterSelector = lazy(() => import('@/components/FilterSelector'));

const DATE_FORMAT = 'YYYY-MM-DD';
const LAZY_FALLBACK = null

const SORT_LABEL_MAP: Record<SortOption, string> = {
    default: '默认排序',
    rating: '好评优先',
    price_low: '低价优先',
    price_high: '高价优先',
};

const FALLBACK_BANNER_MAP: Partial<Record<SortOption, string>> = {
    default: '以下为为您推荐的酒店',
    rating: '以下是不完全满足"好评优先"的酒店',
    price_low: '以下是不完全满足"低价优先"的酒店',
    price_high: '以下是不完全满足"高价优先"的酒店',
};

function readGuestSelection(): GuestSelection {
    try {
        const raw = window.localStorage.getItem(GUEST_SELECTION_STORAGE_KEY);
        if (!raw) return DEFAULT_GUEST_SELECTION;
        return normalizeGuestSelection(JSON.parse(raw));
    } catch {
        return DEFAULT_GUEST_SELECTION;
    }
}

interface GpsCache {
    city: string;
    addressHint: string;
    coords: { lat: number; lng: number };
}

const GPS_CACHE_KEY = 'last_gps_location';

function readGpsCache(): GpsCache | null {
    try {
        const raw = localStorage.getItem(GPS_CACHE_KEY);
        return raw ? (JSON.parse(raw) as GpsCache) : null;
    } catch {
        return null;
    }
}

function writeGpsCache(data: GpsCache) {
    try {
        localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
}

function getDateHint(dateStr: string): string {
    const today = dayjs().startOf('day');
    const d = dayjs(dateStr, DATE_FORMAT, true);
    if (!d.isValid()) return '';
    if (d.isSame(today, 'day')) return '今天';
    if (d.isSame(today.add(1, 'day'), 'day')) return '明天';
    if (d.isSame(today.add(2, 'day'), 'day')) return '后天';
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.day()];
}

const CARD_HEIGHT = 156; // h-36 = 9rem = 144px + 12px gap
const CARD_GAP = 12;

const SearchResultPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isCityVisible, setIsCityVisible] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [showPriceSelector, setShowPriceSelector] = useState(false);
    const [showSortSelector, setShowSortSelector] = useState(false);
    const [showFilterSelector, setShowFilterSelector] = useState(false);
    const [sortValue, setSortValue] = useState<SortOption>('default');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    const city = searchParams.get('city') || '上海';
    const keywordFromUrl = searchParams.get('keyword') || '';
    const searchType = searchParams.get('searchType') === 'hourly' ? 'hourly' as const : 'hotel' as const;
    const latRaw = searchParams.get('lat');
    const lngRaw = searchParams.get('lng');
    const isLocationMode = latRaw !== null && lngRaw !== null;
    const startRaw = searchParams.get('start');
    const endRaw = searchParams.get('end');

    const checkInDate = useMemo(() => {
        if (!startRaw) return dayjs();
        const d = dayjs(startRaw, DATE_FORMAT, true);
        return d.isValid() ? d : dayjs();
    }, [startRaw]);

    const checkOutDate = useMemo(() => {
        if (!endRaw) return dayjs().add(1, 'day');
        const d = dayjs(endRaw, DATE_FORMAT, true);
        return d.isValid() ? d : dayjs().add(1, 'day');
    }, [endRaw]);

    const checkInDisplay = checkInDate.format('MM-DD');
    const checkOutDisplay = checkOutDate.format('MM-DD');

    const [guestVersion, setGuestVersion] = useState(0);
    const guest = useMemo(() => readGuestSelection(), [guestVersion]);
    const totalPersons = guest.adults + guest.children;

    const [tempCity, setTempCity] = useState(city);
    const [tempAddressHint, setTempAddressHint] = useState('');
    const [tempIsLocationMode, setTempIsLocationMode] = useState(isLocationMode);
    const [tempDates, setTempDates] = useState<DateRange>({
        start: checkInDate.format(DATE_FORMAT) as DateString,
        end: checkOutDate.format(DATE_FORMAT) as DateString,
    });
    const [tempGuest, setTempGuest] = useState<GuestSelection>(guest);

    const { location, status: geoStatus, error: geoError, trigger: triggerLocate } = useGeoLocation();
    const isLocating = geoStatus === 'locating' || geoStatus === 'geocoding';

    const [gpsLocation, setGpsLocation] = useState<GpsCache | null>(() => {
        const cached = readGpsCache();
        if (cached) return cached;
        const store = useSearchStore.getState();
        if (store.coords && store.locationLabel) {
            const data: GpsCache = {
                city: store.city,
                addressHint: store.locationLabel,
                coords: store.coords,
            };
            writeGpsCache(data);
            return data;
        }
        return null;
    });

    const tempCityDisplay = useMemo(() => {
        if (!tempAddressHint || tempAddressHint === tempCity) return tempCity;
        return `${tempCity}，${tempAddressHint}`;
    }, [tempCity, tempAddressHint]);

    const tempNights = useMemo(() => {
        const s = dayjs(tempDates.start, DATE_FORMAT, true);
        const e = dayjs(tempDates.end, DATE_FORMAT, true);
        if (!s.isValid() || !e.isValid()) return 1;
        return Math.max(e.diff(s, 'day'), 1);
    }, [tempDates]);

    // --- Filters from store ---
    const filters = useSearchStore((s) => s.filters);

    const parsedStars = useMemo(() => {
        if (!filters.stars || filters.stars.length === 0) return undefined;
        const starSet = new Set<number>();

        if (filters.stars.includes('2')) {
            starSet.add(0).add(1).add(2);
        }
        if (filters.stars.includes('3')) {
            starSet.add(3);
        }
        if (filters.stars.includes('4')) {
            starSet.add(4).add(5);
        }
        return Array.from(starSet);
    }, [filters.stars]);

    // --- Infinite Query ---
    const searchQueryParams = useMemo(() => ({
        city,
        checkIn: startRaw || undefined,
        checkOut: endRaw || undefined,
        guestCount: totalPersons,
        rooms: guest.rooms,
        keyword: keywordFromUrl || undefined,
        minPrice: filters.minPrice ?? undefined,
        maxPrice: filters.maxPrice ?? undefined,
        stars: parsedStars,
        sort: sortValue !== 'default' ? sortValue : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        searchType,
    }), [city, startRaw, endRaw, totalPersons, guest.rooms, keywordFromUrl, filters.minPrice, filters.maxPrice, parsedStars, sortValue, selectedTags, searchType]);

    const {
        allHotels,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useHotelSearch(searchQueryParams);

    // --- Virtual List ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: hasNextPage ? allHotels.length + 1 : allHotels.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => CARD_HEIGHT + CARD_GAP,
        overscan: 5,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // Trigger fetchNextPage when the last item is visible
    useEffect(() => {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;

        if (
            lastItem.index >= allHotels.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [virtualItems, allHotels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const store = useSearchStore.getState();
        store.setCity(city);
        store.setKeyword(keywordFromUrl);
        if (startRaw && endRaw) {
            store.setDateRange({ start: startRaw as DateString, end: endRaw as DateString });
        }
        if (isLocationMode) {
            const lat = Number(latRaw);
            const lng = Number(lngRaw);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                store.setCoords({ lat, lng });
            }
        } else if (store.coords !== null) {
            store.setCoords(null);
            store.setLocatingStatus('idle');
        }
    }, [city, keywordFromUrl, startRaw, endRaw, isLocationMode, latRaw, lngRaw]);

    useLayoutEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const update = () => setHeaderHeight(el.offsetHeight);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const closeSortSelector = useCallback(() => setShowSortSelector(false), []);
    const closeFilterSelector = useCallback(() => setShowFilterSelector(false), []);

    const openPanel = () => {
        setTempCity(city);
        setTempAddressHint(isLocationMode ? (location?.addressHint || gpsLocation?.addressHint || '').trim() : '');
        setTempIsLocationMode(isLocationMode);
        setTempDates({
            start: checkInDate.format(DATE_FORMAT) as DateString,
            end: checkOutDate.format(DATE_FORMAT) as DateString,
        });
        setTempGuest(readGuestSelection());
        setIsPanelOpen(true);
    };

    const closePanel = () => {
        setIsPanelOpen(false);
        setIsCityVisible(false);
        setIsCalendarVisible(false);
    };

    const handleConfirm = () => {
        const next = new URLSearchParams(searchParams);
        next.set('city', tempCity);
        next.set('start', tempDates.start);
        next.set('end', tempDates.end);
        if (tempIsLocationMode && location?.coords) {
            next.set('lat', String(location.coords.lat));
            next.set('lng', String(location.coords.lng));
        } else {
            next.delete('lat');
            next.delete('lng');
        }
        try {
            window.localStorage.setItem(
                GUEST_SELECTION_STORAGE_KEY,
                JSON.stringify(tempGuest),
            );
        } catch { /* ignore */ }
        setGuestVersion((v) => v + 1);
        setSearchParams(next, { replace: true });
        closePanel();
    };

    const handleLocate = useCallback(async () => {
        if (isLocating) return;
        const result = await triggerLocate();
        if (result) {
            const cache: GpsCache = {
                city: result.city,
                addressHint: result.addressHint,
                coords: result.coords,
            };
            setGpsLocation(cache);
            writeGpsCache(cache);
            setTempCity(result.city);
            setTempAddressHint(result.addressHint);
            setTempIsLocationMode(true);
        }
    }, [isLocating, triggerLocate]);

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* 顶部导航与搜索栏 */}
            <div ref={headerRef} className="sticky top-0 z-40 bg-white border-b border-gray-100 shrink-0 pt-2">
                <div className="flex items-center px-3 py-2.5 gap-3">
                    <ChevronLeft
                        size={24}
                        className="shrink-0 cursor-pointer"
                        onClick={() => navigate(-1)}
                    />

                    {/* 搜索胶囊 */}
                    <div className="flex-1 bg-gray-100 rounded-full py-1.5 px-3 flex items-center justify-between">
                        <div
                            className="flex items-center gap-3 pr-2 border-r border-gray-300 cursor-pointer"
                            onClick={() => {
                                if (showSortSelector) { closeSortSelector(); return; }
                                isPanelOpen ? closePanel() : openPanel();
                            }}
                        >
                            <div className="flex flex-col items-center justify-center text-[11px] font-bold text-gray-800 leading-tight gap-0.5">
                                {isLocationMode || city === '我的位置' ? (
                                    <>
                                        <span>我的</span>
                                        <span>位置</span>
                                    </>
                                ) : (
                                    <span>{city}</span>
                                )}
                            </div>
                            <div className="flex flex-col items-start text-[11px] font-bold text-gray-800 leading-tight gap-0.5">
                                <span>{checkInDisplay}</span>
                                <span>{checkOutDisplay}</span>
                            </div>
                            <div className="flex flex-col items-start text-[11px] font-bold text-gray-800 leading-tight gap-0.5">
                                <span>{guest.rooms}间</span>
                                <span>{totalPersons}人</span>
                            </div>
                        </div>

                        <div
                            className="flex items-center gap-1 flex-1 pl-2 cursor-pointer min-w-0"
                            onClick={() => {
                                if (showSortSelector) { closeSortSelector(); return; }
                                setIsCityVisible(true);
                            }}
                        >
                            <Search size={14} className="shrink-0 text-gray-400" />
                            <span className="relative inline-flex items-center min-w-0 pr-4">
                                <span className={`truncate ${keywordFromUrl ? 'text-gray-900 font-bold text-sm' : 'text-gray-400 text-xs'}`}>
                                    {keywordFromUrl || '位置/品牌/酒店'}
                                </span>
                                {keywordFromUrl && (
                                    <span
                                        className="absolute top-0 -right-0.5 w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const next = new URLSearchParams(searchParams);
                                            next.delete('keyword');
                                            setSearchParams(next, { replace: true });
                                            useSearchStore.getState().setKeyword('');
                                        }}
                                    >
                                        <X size={8} className="text-gray-500" />
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    <div
                        className="flex flex-col items-center justify-center text-gray-600 gap-0.5 shrink-0 cursor-pointer"
                        onClick={() => {
                            if (showSortSelector) { closeSortSelector(); return; }
                            navigate('/ai-assistant');
                        }}
                    >
                        <Sparkles size={15} className="text-indigo-500" />
                        <span className="text-[10px] font-medium">小宿</span>
                    </div>
                </div>

                {isPanelOpen ? (
                    <div className="bg-white px-4 pb-3 pt-0.5 border-t border-gray-100">
                        {/* 城市 */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            {isLocating ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm">
                                        {geoStatus === 'geocoding' ? '正在解析位置...' : '正在定位中...'}
                                    </span>
                                </div>
                            ) : (
                                <span
                                    className="text-lg font-bold text-gray-900 cursor-pointer active:text-gray-600 truncate mr-3"
                                    onClick={() => setIsCityVisible(true)}
                                >
                                    {tempCityDisplay}
                                </span>
                            )}
                            <button
                                type="button"
                                className={`shrink-0 text-blue-600 ${isLocating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                onClick={handleLocate}
                                disabled={isLocating}
                                aria-label="定位我的位置"
                            >
                                <MapPin size={20} />
                            </button>
                        </div>

                        {/* 日期 */}
                        <div
                            className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer active:bg-gray-50 -mx-4 px-4"
                            onClick={() => setIsCalendarVisible(true)}
                        >
                            <div className="flex items-baseline gap-1 text-base flex-wrap">
                                <span className="font-bold">
                                    {dayjs(tempDates.start, DATE_FORMAT).format('M月D日')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {getDateHint(tempDates.start)}
                                </span>
                                <span className="mx-1.5 text-gray-300">-</span>
                                <span className="font-bold">
                                    {dayjs(tempDates.end, DATE_FORMAT).format('M月D日')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {getDateHint(tempDates.end)}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 shrink-0 ml-2">
                                共{tempNights}晚
                            </span>
                        </div>

                        {/* 间人数 */}
                        <div className="py-3 border-b border-gray-100 active:bg-gray-50 -mx-4 px-4">
                            <GuestSelectorComponent
                                triggerClassName="[&>div:nth-child(2)]:hidden [&>div:nth-child(3)]:hidden [&_span]:hidden !text-base"
                                onConfirm={(sel) => setTempGuest(sel)}
                            />
                        </div>

                        {/* 确定按钮 */}
                        <button
                            type="button"
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-base font-medium mt-3 active:bg-blue-700 transition-colors"
                            onClick={handleConfirm}
                        >
                            确定
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-around text-xs py-2 text-gray-600 border-t border-gray-50">
                        <span
                            className={`font-bold flex items-center gap-0.5 cursor-pointer ${
                                sortValue !== 'default' || showSortSelector ? 'text-blue-600' : 'text-gray-600'
                            }`}
                            onClick={() => { setShowFilterSelector(false); setShowSortSelector((v) => !v) }}
                        >
                            {SORT_LABEL_MAP[sortValue]}
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${showSortSelector ? 'rotate-180' : ''}`}
                            />
                        </span>
                        <span
                            className="flex items-center gap-0.5 cursor-pointer"
                            onClick={() => {
                                setShowSortSelector(false);
                                setShowPriceSelector(true);
                            }}
                        >
                            价格/星级 <ChevronDown size={12} />
                        </span>
                        <span
                            className={`flex items-center gap-1 cursor-pointer ${
                                selectedTags.length > 0 || showFilterSelector ? 'text-blue-600 font-bold' : ''
                            }`}
                            onClick={() => {
                                setShowSortSelector(false)
                                setShowFilterSelector(v => !v)
                            }}
                        >
                            筛选
                            {selectedTags.length > 0 && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] leading-none font-bold">
                                    {selectedTags.length}
                                </span>
                            )}
                            <Filter size={12} />
                        </span>
                    </div>
                )}
            </div>

            {/* 面板遮罩 */}
            {isPanelOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30"
                    onClick={closePanel}
                />
            )}

            {/* 懒加载弹窗：城市选择器 */}
            <Suspense fallback={LAZY_FALLBACK}>
                <CitySelector
                    visible={isCityVisible}
                    onClose={() => setIsCityVisible(false)}
                    initialKeyword={keywordFromUrl}
                    onSelect={(result) => {
                        const next = new URLSearchParams(searchParams);

                        if (result.keyword !== undefined) {
                            next.set('keyword', result.keyword);
                            useSearchStore.getState().setKeyword(result.keyword);
                        } else {
                            next.delete('keyword');
                            useSearchStore.getState().setKeyword('');

                            if (isPanelOpen) {
                                setTempCity(result.city);
                                setTempAddressHint('');
                                setTempIsLocationMode(false);
                            } else {
                                next.set('city', result.city);
                                next.delete('lat');
                                next.delete('lng');
                            }
                        }

                        setSearchParams(next, { replace: true });
                        setIsCityVisible(false);
                    }}
                    currentLocation={{
                        status: geoStatus,
                        city: location?.city ?? gpsLocation?.city,
                        addressHint: location?.addressHint ?? gpsLocation?.addressHint,
                        coords: location?.coords ?? gpsLocation?.coords ?? null,
                        errorMessage: geoError?.message,
                    }}
                    onRequestLocation={handleLocate}
                />
            </Suspense>

            {/* 懒加载弹窗：日历 */}
            <Suspense fallback={LAZY_FALLBACK}>
                <Calendar
                    visible={isCalendarVisible}
                    selectedRange={tempDates}
                    onConfirm={(range) => {
                        setTempDates(range);
                        setIsCalendarVisible(false);
                    }}
                    onClose={() => setIsCalendarVisible(false)}
                />
            </Suspense>

            {/* 懒加载弹窗：价格/星级 */}
            <Suspense fallback={null}>
                <PriceStarSelector
                    visible={showPriceSelector}
                    onClose={() => setShowPriceSelector(false)}
                />
            </Suspense>

            {/* 懒加载弹窗：排序选择器 */}
            <Suspense fallback={null}>
                <SortSelector
                    visible={showSortSelector}
                    value={sortValue}
                    onChange={setSortValue}
                    onClose={closeSortSelector}
                    topOffset={headerHeight}
                />
            </Suspense>

            {/* 懒加载弹窗：高级筛选 */}
            <Suspense fallback={null}>
                <FilterSelector
                    visible={showFilterSelector}
                    value={selectedTags}
                    onChange={setSelectedTags}
                    onClose={closeFilterSelector}
                    topOffset={headerHeight}
                />
            </Suspense>

            {/* 虚拟化酒店列表 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        加载中...
                    </div>
                ) : isError ? (
                    <div className="text-center py-10 text-red-400">加载失败，请重试</div>
                ) : allHotels.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">暂无符合条件的酒店</div>
                ) : (
                    <div
                        className="relative w-full px-3 pt-3"
                        style={{ height: virtualizer.getTotalSize() + 12 }}
                    >
                        {virtualItems.map((virtualRow) => {
                            const isLoaderRow = virtualRow.index >= allHotels.length;
                            if (isLoaderRow) {
                                return (
                                    <div
                                        key="loader"
                                        className="absolute left-3 right-3 flex items-center justify-center py-4 text-gray-400"
                                        style={{
                                            top: virtualRow.start,
                                            height: virtualRow.size,
                                        }}
                                    >
                                        <Loader2 size={20} className="animate-spin mr-2" />
                                        加载更多...
                                    </div>
                                );
                            }

                            const hotel = allHotels[virtualRow.index];
                            const isFirstFallback =
                                hotel.isFallback === true &&
                                (virtualRow.index === 0 || allHotels[virtualRow.index - 1].isFallback === false);

                            return (
                                <div
                                    key={hotel.id}
                                    className="absolute left-3 right-3"
                                    style={{
                                        top: virtualRow.start,
                                        height: virtualRow.size - CARD_GAP,
                                    }}
                                >
                                    {isFirstFallback && (
                                        <div className="absolute -top-1 left-0 right-0 flex items-center justify-center gap-2 text-xs text-gray-400 pointer-events-none select-none -translate-y-full pb-1">
                                            <span className="flex-1 h-px bg-gray-200" />
                                            <span className="whitespace-nowrap px-2">
                                                {FALLBACK_BANNER_MAP[sortValue] ?? FALLBACK_BANNER_MAP.default}
                                            </span>
                                            <span className="flex-1 h-px bg-gray-200" />
                                        </div>
                                    )}
                                    <HotelCard data={hotel} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const HotelCard = ({ data }: { data: HotelVo }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/hotel/${data.id}`)}
            className="flex bg-white rounded-lg overflow-hidden shadow-sm h-full"
        >
            <div className="w-1/3 relative">
                <img
                    src={data.coverImage || 'https://placehold.co/200x300'}
                    alt={data.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                {data.isFallback ? (
                    <div className="absolute top-0 left-0 bg-amber-500 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                        推荐
                    </div>
                ) : (
                    <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                        精选
                    </div>
                )}
            </div>

            <div className="w-2/3 p-3 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-base line-clamp-1">{data.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-baseline gap-1 text-blue-600 font-medium text-sm">
                            <span className="text-base font-bold">{data.score}</span>
                            <span className="text-xs">超棒</span>
                        </div>
                        <span className="text-xs text-gray-400">{data.reviewCount}点评</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {data.address}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {data.tags?.slice(0, 3).map((tag, i) => (
                            <span
                                key={i}
                                className="text-[10px] text-blue-500 border border-blue-100 bg-blue-50 px-1 rounded"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end items-end gap-1">
                    <span className="text-xs text-red-500 font-medium">特惠一口价</span>
                    <div className="text-red-500">
                        <span className="text-xs">¥</span>
                        <span className="text-xl font-bold">{data.minPrice / 100}</span>
                        <span className="text-xs text-gray-400 ml-1">起</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultPage;
