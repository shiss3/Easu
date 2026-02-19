import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Bot from 'lucide-react/dist/esm/icons/bot';
import { searchHotelsApi, type HotelVo } from '@/services/hotel-search.ts';
import {
    DEFAULT_GUEST_SELECTION,
    GUEST_SELECTION_STORAGE_KEY,
    normalizeGuestSelection,
    type GuestSelection,
} from '@/components/GuestSelector/types.ts';

const DATE_FORMAT = 'YYYY-MM-DD';

function readGuestSelection(): GuestSelection {
    try {
        const raw = window.localStorage.getItem(GUEST_SELECTION_STORAGE_KEY);
        if (!raw) return DEFAULT_GUEST_SELECTION;
        return normalizeGuestSelection(JSON.parse(raw));
    } catch {
        return DEFAULT_GUEST_SELECTION;
    }
}

const SearchResultPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hotelList, setHotelList] = useState<HotelVo[]>([]);

    const city = searchParams.get('city') || '上海';
    const isLocationMode = searchParams.has('lat') && searchParams.has('lng');

    const checkInDisplay = useMemo(() => {
        const raw = searchParams.get('start');
        if (!raw) return dayjs().format('MM-DD');
        const d = dayjs(raw, DATE_FORMAT, true);
        return d.isValid() ? d.format('MM-DD') : dayjs().format('MM-DD');
    }, [searchParams]);

    const checkOutDisplay = useMemo(() => {
        const raw = searchParams.get('end');
        if (!raw) return dayjs().add(1, 'day').format('MM-DD');
        const d = dayjs(raw, DATE_FORMAT, true);
        return d.isValid() ? d.format('MM-DD') : dayjs().add(1, 'day').format('MM-DD');
    }, [searchParams]);

    const guest = useMemo(() => readGuestSelection(), []);
    const totalPersons = guest.adults + guest.children;

    useEffect(() => {
        fetchData();
    }, [city]);

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

    return (
        <div className="min-h-screen bg-gray-50 pb-1">
            {/* 顶部导航与搜索栏 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
                <div className="flex items-center px-3 py-2 gap-3">
                    <ChevronLeft size={24} className="shrink-0 cursor-pointer" onClick={() => navigate(-1)} />

                    {/* 搜索胶囊 */}
                    <div className="flex-1 bg-gray-100 rounded-full py-1.5 px-3 flex items-center justify-between">
                        {/* 左侧信息块：位置 + 日期 + 人数 */}
                        <div className="flex items-center gap-3 pr-2 border-r border-gray-300">
                            {/* 位置 */}
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

                            {/* 日期 */}
                            <div className="flex flex-col items-start text-[11px] font-bold text-gray-800 leading-tight gap-0.5">
                                <span>{checkInDisplay}</span>
                                <span>{checkOutDisplay}</span>
                            </div>

                            {/* 间数 / 人数 */}
                            <div className="flex flex-col items-start text-[11px] font-bold text-gray-800 leading-tight gap-0.5">
                                <span>{guest.rooms}间</span>
                                <span>{totalPersons}人</span>
                            </div>
                        </div>

                        {/* 右侧搜索触发 */}
                        <div className="flex items-center text-gray-400 gap-2 flex-1 pl-2">
                            <Search size={14} />
                            <span className="text-xs truncate">位置/品牌/酒店</span>
                        </div>
                    </div>

                    {/* 右侧 AI 助手 */}
                    <div className="flex flex-col items-center justify-center text-gray-600 gap-0.5 shrink-0 cursor-pointer"
                         onClick={() => navigate('/ai-assistant')}>
                        <Bot size={20} className="text-gray-700" />
                        <span className="text-[10px] font-medium">小宿</span>
                    </div>
                </div>

                {/* 筛选栏 */}
                <div className="flex justify-around text-xs py-2 text-gray-600 border-t border-gray-50">
                    <span className="font-bold text-blue-600 flex items-center gap-0.5">
                        智能排序 <ChevronDown size={12} />
                    </span>
                    <span className="flex items-center gap-0.5">
                        位置距离 <ChevronDown size={12} />
                    </span>
                    <span className="flex items-center gap-0.5">
                        价格/星级 <ChevronDown size={12} />
                    </span>
                    <span className="flex items-center gap-1">
                        筛选 <Filter size={12} />
                    </span>
                </div>
            </div>

            {/* 2. 酒店列表 */}
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

// 提取单个卡片组件
const HotelCard = ({ data }: { data: HotelVo }) => {

    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/hotel/${data.id}`);
    }

    return (
        <div
            onClick={handleClick}
            className="flex bg-white rounded-lg overflow-hidden shadow-sm h-36">
            {/* 左侧图片 */}
            <div className="w-1/3 relative">
                <img
                    src={data.coverImage || 'https://placehold.co/200x300'}
                    alt={data.name}
                    className="w-full h-full object-cover"
                />
                {/* 左下角榜单标签 */}
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                    精选
                </div>
            </div>

            {/* 右侧信息 */}
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
                            <span key={i} className="text-[10px] text-blue-500 border border-blue-100 bg-blue-50 px-1 rounded">
                {tag}
              </span>
                        ))}
                    </div>
                </div>
                {/* 价格区域 */}
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
