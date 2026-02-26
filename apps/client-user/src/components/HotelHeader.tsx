import { useState, useRef, useCallback } from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Star from 'lucide-react/dist/esm/icons/star';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Car from 'lucide-react/dist/esm/icons/car';
import Coffee from 'lucide-react/dist/esm/icons/coffee';
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import ParkingCircle from 'lucide-react/dist/esm/icons/parking-circle';
import Utensils from 'lucide-react/dist/esm/icons/utensils';
import Bath from 'lucide-react/dist/esm/icons/bath';
import Tv from 'lucide-react/dist/esm/icons/tv';
import AirVent from 'lucide-react/dist/esm/icons/air-vent';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import ConciergeBell from 'lucide-react/dist/esm/icons/concierge-bell';
import Bot from 'lucide-react/dist/esm/icons/bot';
import type {HotelDetailVo} from '@/services/hotel-detail.ts';
import type { ReactNode } from 'react';

interface TagIconMatch {
    keywords: string[];
    icon: ReactNode;
    label: string;
}

const TAG_ICON_MAP: TagIconMatch[] = [
    { keywords: ['停车', '车位'], icon: <ParkingCircle size={20} />, label: '停车场' },
    { keywords: ['车', '接送', '班车'], icon: <Car size={20} />, label: '接送服务' },
    { keywords: ['早', '餐', '茶'], icon: <Coffee size={20} />, label: '早餐/茶' },
    { keywords: ['网', 'wifi', 'WIFI', 'Wi-Fi'], icon: <Wifi size={20} />, label: 'WiFi' },
    { keywords: ['健', '体', '健身'], icon: <Dumbbell size={20} />, label: '健身房' },
    { keywords: ['餐厅', '用餐'], icon: <Utensils size={20} />, label: '餐厅' },
    { keywords: ['温泉', '泳池', '浴'], icon: <Bath size={20} />, label: '泳池/温泉' },
    { keywords: ['电视', '影院'], icon: <Tv size={20} />, label: '影音' },
    { keywords: ['空调', '暖气'], icon: <AirVent size={20} />, label: '空调' },
    { keywords: ['洗衣', '干洗'], icon: <Shirt size={20} />, label: '洗衣' },
    { keywords: ['前台', '管家', '服务'], icon: <ConciergeBell size={20} />, label: '管家服务' },
    { keywords: ['机器人', '智能'], icon: <Bot size={20} />, label: '智能服务' },
];

function matchFacilities(tags: string[]) {
    const matched: { icon: ReactNode; label: string }[] = [];
    const used = new Set<number>();

    for (const tag of tags) {
        for (let i = 0; i < TAG_ICON_MAP.length; i++) {
            if (used.has(i)) continue;
            const entry = TAG_ICON_MAP[i];
            if (entry.keywords.some(kw => tag.includes(kw))) {
                matched.push({ icon: entry.icon, label: tag });
                used.add(i);
                break;
            }
        }
    }
    return matched;
}

const HotelHeader = ({ hotel }: { hotel: HotelDetailVo }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const images = hotel.images?.length ? hotel.images : [hotel.coverImage];

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setCurrentIndex(idx);
    }, []);

    const isEasuPick = hotel.tags?.some(t => t.includes('精选'));
    const isPopularPick = hotel.score >= 4.8;
    const facilities = matchFacilities(hotel.tags || []);

    return (
        <div className="relative mb-4">
            {/* Banner 轮播图 */}
            <div className="h-64 overflow-hidden relative">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full"
                >
                    {images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`${hotel.name} ${idx + 1}`}
                            className="w-full h-full object-cover flex-shrink-0 snap-start"
                        />
                    ))}
                </div>
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {/* 信息卡片 */}
            <div className="relative px-4 -mt-6">
                <div className="bg-white rounded-t-xl p-4 shadow-sm border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <h1 className="text-xl font-bold text-gray-900 flex-1 mr-2">{hotel.name}</h1>
                        <div className="flex text-yellow-500">
                            {Array.from({ length: hotel.star || 0 }).map((_, i) => (
                                <Star key={i} size={12} fill="currentColor" />
                            ))}
                        </div>
                    </div>

                    {/* 营销标签 */}
                    {(isEasuPick || isPopularPick) && (
                        <div className="mt-2 flex items-center gap-2">
                            {isEasuPick && (
                                <span className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                                    易宿精选
                                </span>
                            )}
                            {isPopularPick && (
                                <span className="bg-yellow-50 text-yellow-700 text-xs px-1.5 py-0.5 rounded border border-yellow-200 font-medium">
                                    大众精选
                                </span>
                            )}
                        </div>
                    )}

                    {/* 评分与地图 */}
                    <div className="flex mt-4 bg-gray-50 rounded-lg p-3 justify-between items-center">
                        <div className="flex flex-col border-r border-gray-200 pr-4 w-1/2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-blue-600 font-bold text-xl">{hotel.score}</span>
                                <span className="text-blue-600 text-sm font-bold">
                                    {hotel.score >= 4.8 ? '超棒' : hotel.score >= 4.5 ? '很棒' : hotel.score >= 4.0 ? '不错' : '好'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">"{hotel.reviewCount}条点评，整体环境优雅"</div>
                        </div>
                        <div className="flex flex-col pl-4 w-1/2 relative">
                            <div className="text-xs text-gray-800 font-medium line-clamp-1 flex items-center">
                                {hotel.address}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                                距地铁站230米 <ChevronRight size={12}/>
                            </div>
                            <MapPin size={16} className="absolute right-0 top-1 text-gray-400" />
                        </div>
                    </div>

                    {/* 动态设施图标 */}
                    {facilities.length > 0 && (
                        <div className="flex overflow-x-auto snap-x gap-4 mt-4 scrollbar-hide pb-1">
                            {facilities.map((f, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1 snap-start flex-shrink-0 min-w-[56px]">
                                    <div className="text-gray-600 opacity-80">{f.icon}</div>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{f.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HotelHeader;
