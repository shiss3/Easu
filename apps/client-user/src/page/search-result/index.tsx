import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Bot from 'lucide-react/dist/esm/icons/bot';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { searchHotelsApi, type HotelVo } from '@/services/hotel-search.ts';
import {
    DEFAULT_GUEST_SELECTION,
    GUEST_SELECTION_STORAGE_KEY,
    normalizeGuestSelection,
    type GuestSelection,
} from '@/components/GuestSelector/types.ts';
import GuestSelectorComponent from '@/components/GuestSelector';
import { useGeoLocation } from '@/hooks/useHomeData';
import { useSearchStore, type DateRange, type DateString } from '@/store/searchStore';

const CitySelector = lazy(() => import('@/components/Home/CitySelector'));
const Calendar = lazy(() => import('@/components/Calendar'));
const PriceStarSelector = lazy(() => import('@/components/Home/PriceStarSelector'));

const DATE_FORMAT = 'YYYY-MM-DD';
const LAZY_FALLBACK = (
    <div className="p-4 text-center text-gray-500">加载组件中...</div>
);

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

const SearchResultPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hotelList, setHotelList] = useState<HotelVo[]>([]);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isCityVisible, setIsCityVisible] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [showPriceSelector, setShowPriceSelector] = useState(false);

    const city = searchParams.get('city') || '上海';
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

    useEffect(() => {
        fetchData();
    }, [city]);

    useEffect(() => {
        const store = useSearchStore.getState();
        store.setCity(city);
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
    }, [city, startRaw, endRaw, isLocationMode, latRaw, lngRaw]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await searchHotelsApi({ city });
            setHotelList(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleLocate = async () => {
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
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-1">
            {/* 顶部导航与搜索栏 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
                <div className="flex items-center px-3 py-2 gap-3">
                    <ChevronLeft
                        size={24}
                        className="shrink-0 cursor-pointer"
                        onClick={() => navigate(-1)}
                    />

                    {/* 搜索胶囊 */}
                    <div className="flex-1 bg-gray-100 rounded-full py-1.5 px-3 flex items-center justify-between">
                        <div
                            className="flex items-center gap-3 pr-2 border-r border-gray-300 cursor-pointer"
                            onClick={isPanelOpen ? closePanel : openPanel}
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
                            className="flex items-center text-gray-400 gap-1 flex-1 pl-2 cursor-pointer"
                            onClick={() => setIsCityVisible(true)}
                        >
                            <Search size={14} />
                            <span className="text-xs truncate">位置/品牌/酒店</span>
                        </div>
                    </div>

                    <div
                        className="flex flex-col items-center justify-center text-gray-600 gap-0.5 shrink-0 cursor-pointer"
                        onClick={() => navigate('/ai-assistant')}
                    >
                        <Bot size={20} className="text-gray-700" />
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
                        <span className="font-bold text-blue-600 flex items-center gap-0.5">
                            智能排序 <ChevronDown size={12} />
                        </span>
                        <span className="flex items-center gap-0.5">
                            位置距离 <ChevronDown size={12} />
                        </span>
                        <span
                            className="flex items-center gap-0.5 cursor-pointer"
                            onClick={() => setShowPriceSelector(true)}
                        >
                            价格/星级 <ChevronDown size={12} />
                        </span>
                        <span className="flex items-center gap-1">
                            筛选 <Filter size={12} />
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
                    onSelect={(result) => {
                        if (isPanelOpen) {
                            setTempCity(result.city);
                            setTempAddressHint('');
                            setTempIsLocationMode(false);
                        } else {
                            const next = new URLSearchParams(searchParams);
                            next.set('city', result.city);
                            next.delete('lat');
                            next.delete('lng');
                            setSearchParams(next, { replace: true });
                        }
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

            {/* 酒店列表 */}
            <div className="p-3 flex flex-col gap-3">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">加载中...</div>
                ) : hotelList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">暂无符合条件的酒店</div>
                ) : (
                    hotelList.map((hotel) => (
                        <HotelCard key={hotel.id} data={hotel} />
                    ))
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
            className="flex bg-white rounded-lg overflow-hidden shadow-sm h-36"
        >
            <div className="w-1/3 relative">
                <img
                    src={data.coverImage || 'https://placehold.co/200x300'}
                    alt={data.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                    精选
                </div>
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
