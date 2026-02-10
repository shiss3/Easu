import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Search from 'lucide-react/dist/esm/icons/search';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Calendar from '@/components/Calendar.tsx';
import Banner from '@/components/Home/Banner';
import { getHomeBannersApi, type HomeBannerDto } from '@/services/home';
import { getRegeoLocationApi } from '@/services/location';
import GuestSelector from '@/components/GuestSelector';

const LOCATION_STORAGE_KEY = 'easu_user_location';

const formatCityName = (value: string) => {
    return value.replace(/(市|省|自治区|特别行政区)$/g, '').trim();
};

const HomePage = () => {
    const navigate = useNavigate();
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [searchType, setSearchType] = useState<'hotel' | 'hourly'>('hotel');
    const [checkInDate, setCheckInDate] = useState(() => dayjs().startOf('day'));
    const [checkOutDate, setCheckOutDate] = useState(() => dayjs().startOf('day').add(1, 'day'));
    const [banners, setBanners] = useState<HomeBannerDto[]>([]);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [addressHint, setAddressHint] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    const [city, setCity] = useState('上海');
    const isLocationMode = Boolean(coords);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await getHomeBannersApi({ city, limit: 4 });
                setBanners(res.data ?? []);
            } catch (e) {
                console.error(e);
                setBanners([]);
            }
        };
        fetchBanners();
    }, [city]);

    useEffect(() => {
        const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved) as {
                city?: string;
                addressHint?: string;
                coords?: { lat: number; lng: number };
            };
            if (parsed.coords?.lat && parsed.coords?.lng) {
                setCoords(parsed.coords);
                setAddressHint(parsed.addressHint ?? '');
                setLocationStatus('success');
                if (parsed.city) {
                    setCity(parsed.city);
                }
            }
        } catch (error) {
            console.error('读取定位缓存失败', error);
        }
    }, []);

    const handleLocationClick = async () => {
        if (locationStatus === 'loading') return;
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setAddressHint('无法获取位置，请手动选择');
            return;
        }

        setLocationStatus('loading');
        setAddressHint('正在定位中...');

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });
            const nextCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            const res = await getRegeoLocationApi(nextCoords);
            const nextCityRaw = res.data.city || '上海';
            const nextCity = formatCityName(nextCityRaw) || '上海';
            const nextHint = res.data.poiName
                ? `${res.data.poiName}附近`
                : (res.data.formattedAddress || nextCity);

            setCoords(nextCoords);
            setCity(nextCity);
            setAddressHint(nextHint);
            setLocationStatus('success');

            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
                city: nextCity,
                addressHint: nextHint,
                coords: nextCoords,
            }));
        } catch (error) {
            console.error('定位失败', error);
            setCoords(null);
            setLocationStatus('error');
            setAddressHint('无法获取位置，请手动选择');
            localStorage.removeItem(LOCATION_STORAGE_KEY);
        }
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        params.set('city', city);
        if (isLocationMode && coords) {
            params.set('lat', String(coords.lat));
            params.set('lng', String(coords.lng));
        }
        navigate(`/search?${params.toString()}`);
    };

    const today = dayjs().startOf('day');
    const nights = Math.max(checkOutDate.diff(checkInDate, 'day'), 1);
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
                                        setCheckOutDate(checkInDate.add(1, 'day'));
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

                    {(locationStatus === 'loading' || locationStatus === 'success' || locationStatus === 'error') && (
                        <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm flex items-center gap-2 overflow-hidden flex-nowrap">
                            {locationStatus === 'loading' ? (
                                <>
                                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                                    <span className="text-blue-600 shrink-0 whitespace-nowrap">
                                        {addressHint || '正在定位中...'}
                                    </span>
                                </>
                            ) : locationStatus === 'success' ? (
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
                        <div className="flex items-center gap-1 text-xl font-bold min-w-[80px]">
                            {isLocationMode ? '我的位置' : city} <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-black translate-y-0.5 ml-1"></div>
                        </div>
                        <div className="flex-1 ml-4 text-gray-400 text-sm flex items-center">
                            <Search size={16} className="mr-2"/>
                            位置/品牌/酒店
                        </div>
                        <button
                            type="button"
                            onClick={handleLocationClick}
                            className={`text-blue-600 ${locationStatus === 'loading' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
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
                                    <span className="text-sm text-gray-500">离店</span>
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
                            <GuestSelector />
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
                    <MarketingCard title="特价套餐" sub="随时退" icon="🏷️" />
                    <MarketingCard title="超值低价" sub="7折起" icon="📉" />
                </div>

                {/* 季节性Banner */}
                <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-4 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            🍂 步履秋冬，即刻出发
                        </h3>
                        <ChevronRight size={20}/>
                    </div>
                    {/* 横向滚动区域 */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <FeatureChip label="♨️ 暖冬温泉" active />
                        <FeatureChip label="🏖️ 过冬·避寒" />
                        <FeatureChip label="❄️ 冰雪狂欢" />
                    </div>

                    {/* 推荐酒店卡片容器 (水平滚动) */}
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="min-w-[140px] h-[100px] bg-white/20 rounded-lg border border-white/30"></div>
                        ))}
                    </div>
                </div>
            </div>

            <Calendar
                visible={calendarVisible}
                mode={searchType === 'hotel' ? 'range' : 'single'}
                defaultDate={{
                    start: checkInDate.toDate(),
                    end: checkOutDate.toDate(),
                }}
                onConfirm={(start, end) => {
                    const nextCheckIn = dayjs(start);
                    setCheckInDate(nextCheckIn);
                    if (searchType === 'hotel' && end) {
                        setCheckOutDate(dayjs(end));
                        return;
                    }
                    if (searchType === 'hourly') {
                        setCheckOutDate((prev) => {
                            if (prev.isSame(nextCheckIn, 'day') || prev.isBefore(nextCheckIn, 'day')) {
                                return nextCheckIn.add(1, 'day');
                            }
                            return prev;
                        });
                    }
                }}
                onClose={() => setCalendarVisible(false)}
            />
        </div>
    );
};

// 辅助小组件
const MarketingCard = ({ title, sub, icon }: any) => (
    <div className="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

const FeatureChip = ({ label, active }: any) => (
    <div className={`whitespace-nowrap px-3 py-1.5 rounded text-sm ${active ? 'bg-white text-orange-600 font-bold' : 'bg-white/20 text-white'}`}>
        {label}
    </div>
);

export default HomePage;