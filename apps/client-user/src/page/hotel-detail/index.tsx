import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import { getHotelDetailApi, bookRoomApi, type HotelDetailVo, type RoomTypeVo } from '@/services/hotel-detail';
import RoomList from '@/components/RoomList';
import { Button } from '@/components/ui/button';
import HotelHeader from '@/components/HotelHeader.tsx';
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

const Calendar = lazy(() => import('@/components/Calendar'));

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

    const fetchDetail = useCallback(async (hotelId: string, start: string, end: string) => {
        try {
            if (hasLoadedOnce.current) {
                setRoomsLoading(true);
            } else {
                setPageLoading(true);
            }
            const res = await getHotelDetailApi(hotelId, start, end);
            setHotel(res.data);
            hasLoadedOnce.current = true;
        } catch (error) {
            console.error(error);
        } finally {
            setPageLoading(false);
            setRoomsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchDetail(id, dateRange.start, dateRange.end);
        }
    }, [id, dateRange.start, dateRange.end, fetchDetail]);

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

    if (pageLoading) return <div className="p-10 text-center">加载中...</div>;
    if (!hotel) return <div className="p-10 text-center">酒店不存在</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-[100px] relative">
            <div className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div onClick={() => navigate(-1)} className="bg-black/20 p-2 rounded-full backdrop-blur-sm cursor-pointer">
                    <ChevronLeft size={24} />
                </div>
                <div className="flex gap-3">
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-sm"><Share2 size={20} /></div>
                </div>
            </div>

            <div className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 ${isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="flex items-center justify-between px-4 h-[56px]">
                    <div onClick={() => navigate(-1)} className="p-2 -ml-2 cursor-pointer">
                        <ChevronLeft size={24} className="text-gray-800" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900 truncate max-w-[60%]">{hotel.name}</h2>
                    <div className="p-2 -mr-2 cursor-pointer">
                        <Share2 size={20} className="text-gray-800" />
                    </div>
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
