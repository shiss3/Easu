import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';

import {
    getHotelDetailApi,
    bookRoomApi,
    type HotelDetailVo,
    type RoomRealtimeUpdateEvent,
    type RoomTypeVo,
} from '@/services/hotel-detail';
import RoomList from '@/components/Detail/RoomList.tsx';
import { Button } from '@/components/ui/button';
import HotelHeader from '@/components/Detail/HotelHeader.tsx';
import { useUserStore } from '@/store/userStore.ts';
import { authApi } from '@/services/auth';
import { useSearchStore, type DateRange } from '@/store/searchStore';
import { SelectionModal } from '@/components/GuestSelector/SelectionModal.tsx';
import { AgeSelectorModal } from '@/components/GuestSelector/AgeSelectorModal.tsx';
import {
    DEFAULT_GUEST_SELECTION,
    GUEST_SELECTION_STORAGE_KEY,
    normalizeGuestSelection,
    type ChildAge,
    type GuestSelection,
} from '@/components/GuestSelector/types.ts';
import { useHotelRoomRealtime } from '@/hooks/useHotelRoomRealtime';

const Calendar = lazy(() => import('@/components/Calendar'));

const DATE_FORMAT = 'YYYY-MM-DD';
const FALLBACK_REFRESH_MS = 30000;

function readGuestSelection(): GuestSelection {
    try {
        const raw = window.localStorage.getItem(GUEST_SELECTION_STORAGE_KEY);
        if (!raw) return DEFAULT_GUEST_SELECTION;
        return normalizeGuestSelection(JSON.parse(raw));
    } catch {
        return DEFAULT_GUEST_SELECTION;
    }
}

const SkeletonBlock = ({ className }: { className?: string }) => (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
);

const HotelDetailSkeleton = () => (
    <div className="min-h-screen bg-gray-50 pb-[100px]">
        {/* 顶部导航栏占位 */}
        <div className="flex items-center p-4 absolute top-0 left-0 right-0 z-10">
            <div className="w-10 h-10 rounded-full bg-black/10 animate-pulse" />
        </div>

        {/* 图片轮播占位 */}
        <div className="h-64 bg-gray-200 animate-pulse" />

        {/* 信息卡片 */}
        <div className="relative px-4 -mt-6">
            <div className="bg-white rounded-t-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                    <SkeletonBlock className="h-6 w-3/5" />
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div className="mt-2 flex gap-2">
                    <SkeletonBlock className="h-5 w-14" />
                    <SkeletonBlock className="h-5 w-14" />
                </div>

                {/* 评分与地址 */}
                <div className="flex mt-4 bg-gray-50 rounded-lg p-3 gap-4">
                    <div className="flex flex-col gap-2 w-1/2 border-r border-gray-200 pr-4">
                        <div className="flex items-baseline gap-2">
                            <SkeletonBlock className="h-7 w-10" />
                            <SkeletonBlock className="h-4 w-8" />
                        </div>
                        <SkeletonBlock className="h-3 w-full" />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2">
                        <SkeletonBlock className="h-3 w-full" />
                        <SkeletonBlock className="h-3 w-2/3" />
                    </div>
                </div>

                {/* 设施图标 */}
                <div className="flex gap-4 mt-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                            <SkeletonBlock className="h-2.5 w-10" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 房型列表 */}
        <div className="bg-white min-h-[300px] rounded-t-xl mt-2">
            <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col gap-1">
                            <SkeletonBlock className="h-3 w-8" />
                            <SkeletonBlock className="h-5 w-14" />
                        </div>
                        <SkeletonBlock className="h-5 w-10 rounded-full" />
                        <div className="flex flex-col gap-1">
                            <SkeletonBlock className="h-3 w-8" />
                            <SkeletonBlock className="h-5 w-14" />
                        </div>
                    </div>
                    <SkeletonBlock className="h-5 w-16" />
                </div>
            </div>
            <div className="p-4 flex flex-col gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 border-b border-gray-100 pb-6 last:border-0 animate-pulse">
                        <div className="w-28 h-28 rounded-lg bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <SkeletonBlock className="h-5 w-3/4" />
                                <SkeletonBlock className="h-3 w-1/2 mt-2" />
                                <div className="flex gap-1 mt-3">
                                    <SkeletonBlock className="h-4 w-10" />
                                    <SkeletonBlock className="h-4 w-10" />
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <SkeletonBlock className="h-6 w-16" />
                                <SkeletonBlock className="h-8 w-12" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 flex justify-between items-center z-50 safe-area-bottom pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <div className="flex flex-col gap-1">
                <SkeletonBlock className="h-3 w-12" />
                <SkeletonBlock className="h-5 w-16" />
            </div>
            <SkeletonBlock className="h-10 w-24 rounded-lg" />
        </div>
    </div>
);

const HotelDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [hotel, setHotel] = useState<HotelDetailVo | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const token = useUserStore((state) => state.token);
    const refreshToken = useUserStore((state) => state.refreshToken);
    const setAccessToken = useUserStore((state) => state.setAccessToken);
    const logout = useUserStore((state) => state.logout);

    const dateRange = useSearchStore((s) => s.dateRange);
    const setDateRange = useSearchStore((s) => s.setDateRange);

    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    const [isGuestVisible, setIsGuestVisible] = useState(false);
    const [guestDraft, setGuestDraft] = useState<GuestSelection>(() => readGuestSelection());
    const [ageModalOpen, setAgeModalOpen] = useState(false);
    const [activeChildIndex, setActiveChildIndex] = useState<number | null>(null);
    const [guestVersion, setGuestVersion] = useState(0);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const guest = useMemo(() => readGuestSelection(), [guestVersion]);
    const totalPersons = guest.adults + guest.children;

    const checkInDay = useMemo(() => dayjs(dateRange.start, DATE_FORMAT, true), [dateRange.start]);
    const checkOutDay = useMemo(() => dayjs(dateRange.end, DATE_FORMAT, true), [dateRange.end]);
    const nights = useMemo(() => {
        if (!checkInDay.isValid() || !checkOutDay.isValid()) return 1;
        return Math.max(checkOutDay.diff(checkInDay, 'day'), 1);
    }, [checkInDay, checkOutDay]);

    const checkInDisplay = checkInDay.isValid() ? checkInDay.format('M月D日') : '';
    const checkOutDisplay = checkOutDay.isValid() ? checkOutDay.format('M月D日') : '';

    const roomListRef = useRef<HTMLDivElement>(null);
    const hasLoadedOnce = useRef(false);

    const handleBooking = async (room: RoomTypeVo): Promise<void> => {
        if (!token && !refreshToken) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (!token && refreshToken) {
            try {
                const res = await authApi.refreshToken(refreshToken);
                setAccessToken(res.data.accessToken);
            } catch {
                logout();
                navigate('/login', { state: { from: location.pathname } });
                return;
            }
        }

        await bookRoomApi(room.id, dateRange.start, dateRange.end);
    };

    const handleScroll = useCallback(() => {
        setIsScrolled(window.scrollY > 50);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const fetchDetail = useCallback(async (
        hotelId: string,
        start: string,
        end: string,
        options?: { silent?: boolean }
    ) => {
        try {
            const silent = options?.silent === true;
            if (!silent) {
                if (hasLoadedOnce.current) {
                    setRoomsLoading(true);
                } else {
                    setPageLoading(true);
                }
            }
            const res = await getHotelDetailApi(hotelId, start, end);
            setHotel(res.data);
            hasLoadedOnce.current = true;
        } catch (error) {
            console.error(error);
        } finally {
            if (!options?.silent) {
                setPageLoading(false);
                setRoomsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchDetail(id, dateRange.start, dateRange.end);
        }
    }, [id, dateRange.start, dateRange.end, fetchDetail]);

    const applyRoomRealtimeUpdates = useCallback((updates: RoomRealtimeUpdateEvent[]) => {
        if (!updates.length) return;
        const updateMap = new Map<number, RoomRealtimeUpdateEvent>();
        for (const update of updates) {
            updateMap.set(update.roomTypeId, update);
        }

        setHotel((prev) => {
            if (!prev) return prev;

            let changed = false;
            const roomTypes = prev.roomTypes.map((room) => {
                const update = updateMap.get(room.id);
                if (!update) return room;
                if (room.price === update.price && room.quota === update.quota) return room;
                changed = true;
                return { ...room, price: update.price, quota: update.quota };
            });
            if (!changed) return prev;

            const availableRooms = roomTypes.filter((room) => (room.quota ?? 0) > 0);
            const minPrice = availableRooms.length > 0
                ? Math.min(...availableRooms.map((room) => room.price))
                : (roomTypes.length > 0 ? Math.min(...roomTypes.map((room) => room.price)) : 0);

            return { ...prev, roomTypes, minPrice };
        });
    }, []);

    useHotelRoomRealtime({
        hotelId: id,
        checkIn: dateRange.start,
        checkOut: dateRange.end,
        enabled: Boolean(id && dateRange.start && dateRange.end),
        onSnapshot: (rooms) => applyRoomRealtimeUpdates(rooms),
        onRoomUpdate: (update) => applyRoomRealtimeUpdates([update]),
        onConnectionChange: setRealtimeConnected,
    });

    useEffect(() => {
        if (!id || realtimeConnected) return;

        const timer = window.setInterval(() => {
            fetchDetail(id, dateRange.start, dateRange.end, { silent: true });
        }, FALLBACK_REFRESH_MS);

        return () => window.clearInterval(timer);
    }, [id, dateRange.start, dateRange.end, realtimeConnected, fetchDetail]);

    const handleCalendarConfirm = (range: DateRange) => {
        setDateRange(range);
        setIsCalendarVisible(false);
    };

    const openGuestModal = () => {
        setGuestDraft(readGuestSelection());
        setIsGuestVisible(true);
    };

    const closeGuestModal = () => {
        setIsGuestVisible(false);
        setAgeModalOpen(false);
        setActiveChildIndex(null);
    };

    const handleGuestConfirm = (selection: GuestSelection) => {
        const normalized = normalizeGuestSelection(selection);
        try {
            window.localStorage.setItem(GUEST_SELECTION_STORAGE_KEY, JSON.stringify(normalized));
        } catch { /* ignore */ }
        setGuestVersion((v) => v + 1);
        closeGuestModal();
    };

    const scrollToRoomList = () => {
        if (!roomListRef.current) return;
        const offset = roomListRef.current.offsetTop - 56;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    };

    if (pageLoading) return <HotelDetailSkeleton />;
    if (!hotel) return <div className="p-10 text-center">酒店不存在</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-[100px] relative">
            <div className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div onClick={() => navigate(-1)} className="bg-black/20 p-2 rounded-full backdrop-blur-sm cursor-pointer">
                    <ChevronLeft size={24} />
                </div>
                <div className="w-10" />
            </div>

            <div className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ${isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="flex items-center justify-between px-4 h-[56px]">
                    <div onClick={() => navigate(-1)} className="p-2 -ml-2 cursor-pointer">
                        <ChevronLeft size={24} className="text-gray-800" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900 truncate max-w-[60%]">{hotel.name}</h2>
                    <div className="w-10" />
                </div>
            </div>

            <HotelHeader hotel={hotel} />

            <div ref={roomListRef}>
                <RoomList
                    onBook={handleBooking}
                    rooms={hotel.roomTypes}
                    loading={roomsLoading}
                    checkIn={checkInDisplay}
                    checkOut={checkOutDisplay}
                    nights={nights}
                    guestInfo={{ rooms: guest.rooms, totalPersons }}
                    onOpenCalendar={() => setIsCalendarVisible(true)}
                    onOpenGuest={openGuestModal}
                />
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 flex justify-between items-center z-50 safe-area-bottom pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">价格说明</span>
                    <div className="text-red-600 font-bold text-base">
                        ¥{hotel.minPrice != null ? hotel.minPrice : '--'}<span className="text-xs font-normal text-gray-500">起</span>
                    </div>
                </div>
                <Button
                    onClick={scrollToRoomList}
                    className="px-6 py-3 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700"
                >
                    查看房型
                </Button>
            </div>

            <Suspense fallback={null}>
                <Calendar
                    visible={isCalendarVisible}
                    selectedRange={dateRange}
                    onConfirm={handleCalendarConfirm}
                    onClose={() => setIsCalendarVisible(false)}
                />
            </Suspense>

            <SelectionModal
                open={isGuestVisible}
                value={guestDraft}
                onChange={(next) => setGuestDraft(normalizeGuestSelection(next))}
                onClose={closeGuestModal}
                onOpenAgeSelector={(childIndex) => {
                    setActiveChildIndex(childIndex);
                    setAgeModalOpen(true);
                }}
                onConfirm={handleGuestConfirm}
            />

            <AgeSelectorModal
                open={ageModalOpen}
                childIndex={activeChildIndex}
                selectedAge={activeChildIndex == null ? null : (guestDraft.childAges[activeChildIndex] as ChildAge | null)}
                onSelect={(age) => {
                    if (activeChildIndex == null) return;
                    setGuestDraft((prev) =>
                        normalizeGuestSelection({
                            ...prev,
                            childAges: prev.childAges.map((v, idx) => (idx === activeChildIndex ? age : v)),
                        })
                    );
                }}
                onClose={() => {
                    setAgeModalOpen(false);
                    setActiveChildIndex(null);
                }}
            />
        </div>
    );
};

export default HotelDetailPage;
