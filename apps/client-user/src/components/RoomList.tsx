import { useState } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import { toast } from 'sonner';
import type { RoomTypeVo } from '@/services/hotel-detail.ts';
import { Button } from '@/components/ui/button';

interface GuestInfo {
    rooms: number;
    totalPersons: number;
}

interface RoomListProps {
    rooms: RoomTypeVo[];
    loading?: boolean;
    checkIn: string;
    checkOut: string;
    nights: number;
    guestInfo: GuestInfo;
    onBook: (room: RoomTypeVo) => Promise<void>;
    onOpenCalendar: () => void;
    onOpenGuest: () => void;
}

const RoomList = ({ rooms, loading, checkIn, checkOut, nights, guestInfo, onBook, onOpenCalendar, onOpenGuest }: RoomListProps) => {
    return (
        <div className="bg-white min-h-[500px] rounded-t-xl mt-2">
            <div className="sticky top-[60px] z-40 bg-white border-b border-gray-100 p-4">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <div className="flex gap-4 items-center cursor-pointer" onClick={onOpenCalendar}>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">入住</div>
                            <div className="font-bold">{checkIn}</div>
                        </div>
                        <div className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                            {nights}晚
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">离店</div>
                            <div className="font-bold">{checkOut}</div>
                        </div>
                    </div>
                    <div
                        className="flex items-center gap-1 text-sm text-blue-600 font-medium cursor-pointer"
                        onClick={onOpenGuest}
                    >
                        {guestInfo.rooms}间, {guestInfo.totalPersons}人 <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                {loading
                    ? [1, 2, 3].map((i) => <RoomSkeleton key={i} />)
                    : rooms.map((room) => <RoomItem onBook={onBook} key={room.id} room={room} />)
                }
            </div>
        </div>
    );
};

const RoomSkeleton = () => (
    <div className="flex gap-3 border-b border-gray-100 pb-6 last:border-0 animate-pulse">
        <div className="w-28 h-28 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-between">
            <div>
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
                <div className="flex gap-1 mt-3">
                    <div className="h-4 bg-gray-200 rounded w-10" />
                    <div className="h-4 bg-gray-200 rounded w-10" />
                </div>
            </div>
            <div className="flex justify-between items-end mt-2">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-8 bg-gray-200 rounded w-12" />
            </div>
        </div>
    </div>
);

type BookingState = 'idle' | 'loading' | 'success' | 'error';

const RoomItem = ({ room, onBook }: { room: RoomTypeVo; onBook: (room: RoomTypeVo) => Promise<void> }) => {
    const [bookingState, setBookingState] = useState<BookingState>('idle');
    const [localQuota, setLocalQuota] = useState(room.quota ?? 0);

    const realPrice = room.price;
    const originalPrice = Math.round(realPrice * 1.17);
    const soldOut = localQuota === 0;

    const tags: { label: string; color: 'blue' | 'green' | 'orange' }[] = [];
    if (room.hasBreakfast) tags.push({ label: '含早', color: 'green' });
    if (room.hasWindow) tags.push({ label: '有窗', color: 'blue' });
    if (room.tags?.includes('钟点房')) tags.push({ label: '钟点房', color: 'orange' });

    const tagColorMap = {
        blue: 'text-blue-600 border-blue-200',
        green: 'text-green-600 border-green-200',
        orange: 'text-orange-600 border-orange-200',
    };

    const handleBook = async () => {
        if (bookingState !== 'idle' || soldOut) return;

        setBookingState('loading');

        const [result] = await Promise.allSettled([
            onBook(room),
            new Promise((r) => setTimeout(r, 500)),
        ]);

        if (result.status === 'fulfilled') {
            setLocalQuota((prev) => Math.max(prev - 1, 0));
            setBookingState('success');
            setTimeout(() => setBookingState('idle'), 1000);
        } else {
            setBookingState('error');
            toast.error('预定失败，请检查网络问题');
            setTimeout(() => setBookingState('idle'), 1000);
        }
    };

    const renderQuotaLabel = () => {
        if (soldOut) return null;
        if (localQuota > 5) return <span className="text-[10px] text-green-600">库存充足</span>;
        return <span className="text-[10px] text-orange-500">仅剩{localQuota}间</span>;
    };

    const renderBookButton = () => {
        const disabled = bookingState !== 'idle';
        let content: React.ReactNode;
        let cls = 'h-8 px-4 text-white rounded-md font-bold ';

        switch (bookingState) {
            case 'loading':
                content = <Loader2 size={16} className="animate-spin" />;
                cls += 'bg-blue-600';
                break;
            case 'success':
                content = <Check size={16} />;
                cls += 'bg-green-500 hover:bg-green-500';
                break;
            case 'error':
                content = <X size={16} />;
                cls += 'bg-red-500 hover:bg-red-500';
                break;
            default:
                content = '订';
                cls += 'bg-blue-600 hover:bg-blue-700';
        }

        return (
            <Button onClick={handleBook} disabled={disabled} className={cls}>
                {content}
            </Button>
        );
    };

    return (
        <div className={`flex gap-3 border-b border-gray-100 pb-6 last:border-0 ${soldOut ? 'opacity-50 grayscale' : ''}`}>
            <div className="relative w-28 h-28 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <img src={room.images?.[0] || 'https://placehold.co/200'} alt={room.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1">
                        {room.name}
                        <ChevronRight size={14} className="text-gray-400" />
                    </h3>
                    <div className="text-xs text-gray-500 mt-1 space-x-2">
                        <span>{room.bedInfo}</span>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                            {tags.map((tag) => (
                                <span key={tag.label} className={`text-[10px] border px-1 rounded ${tagColorMap[tag.color]}`}>
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-end mt-2">
                    {soldOut ? (
                        <div />
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 line-through">¥{originalPrice}</span>
                            <div className="flex items-baseline text-blue-600">
                                <span className="text-xs">¥</span>
                                <span className="text-xl font-bold">{realPrice}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-end gap-1">
                        {soldOut ? (
                            <span className="text-sm text-gray-400 font-medium">已订完</span>
                        ) : (
                            renderBookButton()
                        )}
                        {renderQuotaLabel()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomList;
