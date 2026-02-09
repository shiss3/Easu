import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Star from 'lucide-react/dist/esm/icons/star';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Car from 'lucide-react/dist/esm/icons/car';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Coffee from 'lucide-react/dist/esm/icons/coffee';
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell';
import Bot from 'lucide-react/dist/esm/icons/bot';
import type {HotelDetailVo} from '@/services/hotel-detail.ts';

const HotelHeader = ({ hotel }: { hotel: HotelDetailVo }) => {
    return (
        <div className="relative mb-4">
            {/* 顶部大图 / 视频位 */}
            <div className="h-64 overflow-hidden relative">
                <img
                    src={hotel.coverImage}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                />
                {/* 图片右下角相册入口 */}
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    相册 {hotel.images.length}
                </div>
            </div>

            {/* 信息卡片 - 负Margin上移覆盖图片 */}
            <div className="relative px-4 -mt-6">
                <div className="bg-white rounded-t-xl p-4 shadow-sm border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <h1 className="text-xl font-bold text-gray-900 flex-1 mr-2">{hotel.name}</h1>
                        <div className="flex text-yellow-500">
                            {[1,2,3,4].map(i=><Star key={i} size={14} fill="currentColor"/>)}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                        <span className="bg-yellow-50 text-yellow-700 text-xs px-1 rounded border border-yellow-200">2025年开业</span>
                        <span className="bg-black text-gold-200 text-xs text-yellow-300 px-1 rounded">优享会</span>
                    </div>

                    {/* 评分与地图 */}
                    <div className="flex mt-4 bg-gray-50 rounded-lg p-3 justify-between items-center">
                        <div className="flex flex-col border-r border-gray-200 pr-4 w-1/2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-blue-600 font-bold text-xl">{hotel.score}</span>
                                <span className="text-blue-600 text-sm font-bold">超棒</span>
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

                    {/* 设施图标 Grid */}
                    <div className="grid grid-cols-5 gap-2 mt-4 text-center">
                        <FacilityIcon icon={<Car/>} label="免费停车" />
                        <FacilityIcon icon={<UserRound/>} label="洗衣房" />
                        <FacilityIcon icon={<Coffee/>} label="茶室" />
                        <FacilityIcon icon={<Dumbbell/>} label="免费健身" />
                        <FacilityIcon icon={<Bot/>} label="机器人" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const FacilityIcon = ({icon, label}: any) => (
    <div className="flex flex-col items-center gap-1">
        <div className="text-gray-600 opacity-80 scale-90">{icon}</div>
        <span className="text-[10px] text-gray-500 whitespace-nowrap">{label}</span>
    </div>
)

export default HotelHeader;