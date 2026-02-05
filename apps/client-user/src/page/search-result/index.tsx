import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Filter } from 'lucide-react';
import { searchHotelsApi, type HotelVo } from '@/services/hotel-search.ts';

const SearchResultPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hotelList, setHotelList] = useState<HotelVo[]>([]);

    // 从 URL 获取查询参数
    const city = searchParams.get('city') || '上海';

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
            {/* 1. 顶部导航与搜索栏 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
                <div className="flex items-center px-3 py-2 gap-3">
                    <ChevronLeft size={24} onClick={() => navigate(-1)} />
                    <div className="flex-1 bg-gray-100 rounded-full h-9 flex items-center px-3 text-sm text-gray-500">
                        <Search size={16} className="mr-2" />
                        <span>{city} · 1月29日-30日</span>
                    </div>
                    <div className="flex flex-col items-center text-[10px] text-gray-600">
                        <div className="font-bold">地图</div>
                    </div>
                </div>

                {/* 筛选 Tabs */}
                <div className="flex justify-around text-sm py-2 text-gray-600 border-t border-gray-50">
                    <span className="font-bold text-blue-600">欢迎度排序</span>
                    <span>位置距离</span>
                    <span>价格/星级</span>
                    <span className="flex items-center gap-1">筛选 <Filter size={12}/></span>
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