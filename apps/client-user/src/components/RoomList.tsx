import { ChevronDown, ChevronRight } from 'lucide-react';
import type {RoomTypeVo} from '@/services/hotel-detail.ts';
import { Button } from '@/components/ui/button';

interface RoomListProps {
    rooms: RoomTypeVo[];
    onBook: (room: RoomTypeVo) => void; // 新增：接收一个点击事件，并把当前房型传回去
}

const RoomList = ({ rooms, onBook }: RoomListProps) => {
    return (
        <div className="bg-white min-h-[500px] rounded-t-xl mt-2">
            {/* 1. 日期选择条 */}
            <div className="sticky top-[60px] z-40 bg-white border-b border-gray-100 p-4">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <div className="flex gap-4 items-center">
                        <div className="text-center">
                            <div className="text-xs text-gray-500">入住</div>
                            <div className="font-bold">2月2日</div>
                        </div>
                        <div className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                            4晚
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">离店</div>
                            <div className="font-bold">2月6日</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                        1间, 1人 <ChevronDown size={14} />
                    </div>
                </div>

                {/* 筛选标签 (Image 2) */}
                <div className="flex gap-3 mt-3 overflow-x-auto scrollbar-hide">
                    {['双床房','含早餐','大床房','三床房'].map((tag, idx) => (
                        <span key={idx} className={`whitespace-nowrap px-3 py-1 rounded text-xs ${idx === 0 ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                    {tag}
                </span>
                    ))}
                </div>
            </div>

            {/* 2. 房型列表 */}
            <div className="p-4 flex flex-col gap-6">
                {rooms.map(room => (
                    <RoomItem onBook={onBook} key={room.id} room={room} />
                ))}
            </div>
        </div>
    );
};

// 单个房型卡片
const RoomItem = ({ room, onBook }: { room: RoomTypeVo; onBook: (room: RoomTypeVo) => void }) => {
    return (
        <div className="flex gap-3 border-b border-gray-100 pb-6 last:border-0">
            {/* 左侧图 */}
            <div className="relative w-28 h-28 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <img src={room.images?.[0] || 'https://placehold.co/200'} alt={room.name} className="w-full h-full object-cover" />
            </div>

            {/* 右侧详情 */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1">
                        {room.name}
                        <ChevronRight size={14} className="text-gray-400"/>
                    </h3>
                    <div className="text-xs text-gray-500 mt-1 space-x-2">
                        <span>{room.bedInfo}</span>
                        <span>25-27m²</span>
                        <span>2-3层</span>
                    </div>
                    {/* 营销标签 */}
                    <div className="flex gap-1 mt-2">
                        <span className="text-[10px] text-blue-600 border border-blue-200 px-1 rounded">立即确认</span>
                        <span className="text-[10px] text-orange-600 border border-orange-200 px-1 rounded">需付担保金</span>
                    </div>
                </div>

                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through">¥{Math.floor(room.price * 1.2 / 100)}</span>
                        <div className="flex items-baseline text-blue-600">
                            <span className="text-xs">¥</span>
                            <span className="text-xl font-bold">{room.price / 100}</span>
                        </div>
                    </div>
                    {/* 订购按钮 */}
                    <div className="flex flex-col items-end gap-1">
                        <Button
                            onClick={() => onBook(room)}
                            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold">
                            订
                        </Button>
                        <span className="text-[10px] text-orange-500">仅剩3间</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RoomList;