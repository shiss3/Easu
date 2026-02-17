import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Search from 'lucide-react/dist/esm/icons/search';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import Banner from '@/components/Home/Banner';
import GuestSelector from '@/components/GuestSelector';
import { useBanners, useGeoLocation } from '@/hooks/useHomeData';
import { useIsLocationMode, useNights, useSearchStore } from '@/store/searchStore';

const Calendar = lazy(() => import('@/components/Calendar'));
const CitySelector = lazy(() => import('@/components/Home/CitySelector'));
const PriceStarSelector = lazy(() => import('@/components/Home/PriceStarSelector'));

const DATE_FORMAT = 'YYYY-MM-DD';

const HomePage = () => {
    const navigate = useNavigate();
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [citySelectorVisible, setCitySelectorVisible] = useState(false);
    const [showPriceSelector, setShowPriceSelector] = useState(false);
    const hydratedRef = useRef(false);

    const city = useSearchStore((state) => state.city);
    const coords = useSearchStore((state) => state.coords);
    const locationLabel = useSearchStore((state) => state.locationLabel);
    const dateRange = useSearchStore((state) => state.dateRange);
    const filters = useSearchStore((state) => state.filters);
    const searchType = useSearchStore((state) => state.searchType);
    const setSearchType = useSearchStore((state) => state.setSearchType);
    const setDateRange = useSearchStore((state) => state.setDateRange);
    const hydrateFromUrl = useSearchStore((state) => state.hydrateFromUrl);
    const hydrateFromStorage = useSearchStore((state) => state.hydrateFromStorage);
    const locatingStatus = useSearchStore((state) => state.locatingStatus);
    const isLocationMode = useIsLocationMode();
    const nights = useNights();
    const { data: banners = [] } = useBanners(city);
    const { location, status, error, trigger } = useGeoLocation();

    const checkInDate = useMemo(
        () => dayjs(dateRange.start, DATE_FORMAT, true).startOf('day'),
        [dateRange.start],
    );
    const checkOutDate = useMemo(
        () => dayjs(dateRange.end, DATE_FORMAT, true).startOf('day'),
        [dateRange.end],
    );

    useEffect(() => {
        if (hydratedRef.current) {
            return;
        }
        hydratedRef.current = true;
        const params = new URLSearchParams(window.location.search);
        // URL 优先级最高：先读取存储兜底缺失字段，再用 URL 覆盖对应字段。
        hydrateFromStorage();
        hydrateFromUrl(params);
    }, [hydrateFromStorage, hydrateFromUrl]);

    const isLocating = status === 'locating' || status === 'geocoding';
    const locationStatus = locatingStatus === 'locating' || locatingStatus === 'geocoding' ? status : locatingStatus;
    const resolvedLocationHint = (location?.addressHint || locationLabel).trim();
    const shouldShowLocatedHint =
        isLocationMode &&
        Boolean(resolvedLocationHint) &&
        (locationStatus === 'success' || locationStatus === 'idle');

    const addressHint = useMemo(() => {
        if (locationStatus === 'locating') {
            return '正在定位中...';
        }
        if (locationStatus === 'geocoding') {
            return '正在解析位置信息...';
        }
        if (locationStatus === 'error') {
            return error?.message || '无法获取位置，请手动选择';
        }
        return resolvedLocationHint;
    }, [error?.message, locationStatus, resolvedLocationHint]);

    const handleLocationClick = async () => {
        if (isLocating) {
            return;
        }
        await trigger();
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        params.set('city', city);
        params.set('start', dateRange.start);
        params.set('end', dateRange.end);
        params.set('searchType', searchType);
        if (isLocationMode && coords) {
            params.set('lat', String(coords.lat));
            params.set('lng', String(coords.lng));
        }
        if (filters.minPrice != null) {
            params.set('minPrice', String(filters.minPrice));
        }
        if (filters.maxPrice != null) {
            params.set('maxPrice', String(filters.maxPrice));
        }
        if (filters.stars?.length) {
            params.set('stars', filters.stars.join(','));
        }
        navigate(`/search?${params.toString()}`);
    };

    const today = useMemo(() => dayjs().startOf('day'), []);
    const checkInHint = checkInDate.isSame(today, 'day') ? '今天' : '';
    const checkOutHint = checkOutDate.isSame(today.add(1, 'day'), 'day') ? '明天' : '';
    return (
        <div className="relative">
            {/* 1. 顶部 Banner 区域 */}
            <Banner items={banners} />

            {/* 2. 核心搜索卡片 - 负Margin实现重叠效果 */}
            <div className="relative px-4 -mt-16 z-10">
                <div className="rounded-xl shadow-lg overflow-hidden">
                    {/* Tabs: 酒店/民宿 & 钟点房 */}
                    <div className="bg-[#ebf3ff] px-4 pt-3">
                        <div className="grid grid-cols-2 text-base font-medium">
                            <button
                                type="button"
                                onClick={() => {
                                    if (checkOutDate.isSame(checkInDate, 'day') || checkOutDate.isBefore(checkInDate, 'day')) {
                                        setDateRange({
                                            start: checkInDate.format(DATE_FORMAT) as typeof dateRange.start,
                                            end: checkInDate.add(1, 'day').format(DATE_FORMAT) as typeof dateRange.end,
                                        });
                                    }
                                    setSearchType('hotel');
                                }}
                                className={`py-2 text-center ${
                                    searchType === 'hotel'
                                        ? 'bg-white rounded-t-lg text-slate-900 font-semibold'
                                        : 'text-slate-500'
                                }`}
                            >
                                酒店/民宿
                            </button>
                            <button
                                type="button"
                                onClick={() => setSearchType('hourly')}
                                className={`py-2 text-center ${
                                    searchType === 'hourly'
                                        ? 'bg-white rounded-t-lg text-slate-900 font-semibold'
                                        : 'text-slate-500'
                                }`}
                            >
                                钟点房
                            </button>
                        </div>
                    </div>

                    <div className="bg-white px-5 pb-5 pt-4 rounded-b-xl">

                    {(locationStatus === 'locating' || locationStatus === 'geocoding' || locationStatus === 'error' || shouldShowLocatedHint) && (
                        <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm flex items-center gap-2 overflow-hidden flex-nowrap">
                            {locationStatus === 'locating' || locationStatus === 'geocoding' ? (
                                <>
                                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                                    <span className="text-blue-600 shrink-0 whitespace-nowrap">
                                        {addressHint || '正在定位中...'}
                                    </span>
                                </>
                            ) : shouldShowLocatedHint ? (
                                <>
                                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">已定位到 :</span>
                                    <span className="text-gray-900 block flex-1 truncate">{addressHint}</span>
                                </>
                            ) : (
                                <span className="text-red-500 shrink-0 whitespace-nowrap">无法获取位置，请手动选择</span>
                            )}
                        </div>
                    )}

                    {/* 城市与搜索 */}
                    <div className="flex items-center justify-between border-b border-gray-100 py-4">
                        <button
                            type="button"
                            onClick={() => setCitySelectorVisible(true)}
                            className="flex items-center gap-1 text-xl font-bold min-w-[80px] cursor-pointer"
                        >
                            {isLocationMode ? '我的位置' : city}
                            <ChevronDown size={18} className="text-gray-600 ml-0.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCitySelectorVisible(true)}
                            className="flex-1 ml-4 text-gray-400 text-sm flex items-center cursor-pointer"
                        >
                            <Search size={16} className="mr-2"/>
                            位置/品牌/酒店
                        </button>
                        <button
                            type="button"
                            onClick={handleLocationClick}
                            className={`text-blue-600 ${isLocating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            aria-label="定位我的位置"
                        >
                            <MapPin size={20} />
                        </button>
                    </div>

                    {/* 日期选择 */}
                    <div
                        className="flex justify-between items-center border-b border-gray-100 py-4 cursor-pointer"
                        onClick={() => setCalendarVisible(true)}
                    >
                        {searchType === 'hourly' ? (
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">入住</span>
                                <div className="flex items-end gap-2">
                                    <span className="text-lg font-bold">{checkInDate.format('M月D日')}</span>
                                    {checkInHint ? (
                                        <span className="text-xs text-gray-500 mb-1">{checkInHint}</span>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-500">入住</span>
                                    <div className="flex items-end gap-2">
                                        <span className="text-lg font-bold">{checkInDate.format('M月D日')}</span>
                                        {checkInHint ? (
                                            <span className="text-xs text-gray-500 mb-1">{checkInHint}</span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">
                                    共{nights}晚
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-sm text-gray-500 text-left">离店</span>
                                    <div className="flex items-end justify-end gap-2">
                                        <span className="text-lg font-bold">{checkOutDate.format('M月D日')}</span>
                                        {checkOutHint ? (
                                            <span className="text-xs text-gray-500 mb-1">{checkOutHint}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 人数/价格 */}
                    {searchType === 'hotel' ? (
                        <div className="py-4">
                            <GuestSelector onPriceStarClick={() => setShowPriceSelector(true)} />
                        </div>
                    ) : null}

                    {/* 查询按钮 */}
                    <Button
                        onClick={handleSearch}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg rounded-lg shadow-blue-200 shadow-xl mt-2">
                        查询
                    </Button>
                    </div>
                </div>
            </div>

            {/* 3. 营销入口 Grid (图1下半部分) */}
            <div className="px-4 mt-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <MarketingCard title="口碑榜" sub="城市精选" icon="🏆" />
                    <MarketingCard 
                        title="AI智选" 
                        sub="问问小宿" 
                        icon="🏷️" 
                        onClick={() => navigate('/ai-assistant')}
                    />
                    <MarketingCard title="超值低价" sub="7折起" icon="📉" />
                </div>

                {/* 季节性Banner */}
                {/*<div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-4 text-white">*/}
                {/*    <div className="flex justify-between items-center mb-4">*/}
                {/*        <h3 className="font-bold text-lg flex items-center gap-2">*/}
                {/*            🍂 步履秋冬，即刻出发*/}
                {/*        </h3>*/}
                {/*        <ChevronRight size={20}/>*/}
                {/*    </div>*/}
                {/*    /!* 横向滚动区域 *!/*/}
                {/*    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">*/}
                {/*        <FeatureChip label="♨️ 暖冬温泉" active />*/}
                {/*        <FeatureChip label="🏖️ 过冬·避寒" />*/}
                {/*        <FeatureChip label="❄️ 冰雪狂欢" />*/}
                {/*    </div>*/}

                {/*    /!* 推荐酒店卡片容器 (水平滚动) *!/*/}
                {/*    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">*/}
                {/*        {[1,2,3].map(i => (*/}
                {/*            <div key={i} className="min-w-[140px] h-[100px] bg-white/20 rounded-lg border border-white/30"></div>*/}
                {/*        ))}*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>

            <Suspense fallback={null}>
                <Calendar
                    visible={calendarVisible}
                    mode={searchType === 'hotel' ? 'range' : 'single'}
                    selectedRange={dateRange}
                    onConfirm={(range) => setDateRange(range)}
                    onClose={() => setCalendarVisible(false)}
                />
            </Suspense>

            <Suspense fallback={null}>
                <CitySelector
                    visible={citySelectorVisible}
                    onClose={() => setCitySelectorVisible(false)}
                    currentLocation={{
                        status: locationStatus,
                        city: location?.city || city,
                        addressHint: resolvedLocationHint,
                        coords,
                        errorMessage: error?.message,
                    }}
                    onRequestLocation={handleLocationClick}
                />
            </Suspense>

            <Suspense fallback={null}>
                <PriceStarSelector
                    visible={showPriceSelector}
                    onClose={() => setShowPriceSelector(false)}
                />
            </Suspense>
        </div>
    );
};

// 辅助小组件
interface MarketingCardProps {
    title: string;
    sub: string;
    icon: ReactNode;
    onClick?: () => void;
}

const MarketingCard = ({ title, sub, icon, onClick }: MarketingCardProps) => (
    <div 
        className="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform"
        onClick={onClick}
    >
        <div className="text-2xl mb-1">{icon}</div>
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

// const FeatureChip = ({ label, active }: any) => (
//     <div className={`whitespace-nowrap px-3 py-1.5 rounded text-sm ${active ? 'bg-white text-orange-600 font-bold' : 'bg-white/20 text-white'}`}>
//         {label}
//     </div>
// );

export default HomePage;