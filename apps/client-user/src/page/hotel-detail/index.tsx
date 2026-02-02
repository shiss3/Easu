import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Heart, MoreHorizontal } from 'lucide-react';
import {getHotelDetailApi, type HotelDetailVo, type RoomTypeVo} from '@/services/hotel-detail';
import RoomList from '@/components/RoomList';
import { Button } from '@/components/ui/button';
import HotelHeader from "@/components/HotelHeader.tsx";
import {useUserStore} from "@/store/userStore.ts";

const HotelDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [hotel, setHotel] = useState<HotelDetailVo | null>(null);
    const [loading, setLoading] = useState(true);
    const token = useUserStore((state) => state.token);

    const handleBooking = (room: RoomTypeVo) => {
        // 权限检查
        if (!token) {
            // 未登录，跳转到登录页，并带上 from 状态
            navigate('/login', {
                state: { from: location.pathname }
            });
            return;
        }

        // 已登录，进入下单流程
        console.log('进入下单流程');
        // navigate('/booking/create', ...);
        console.log('跳转下单页', room);
    };

    useEffect(() => {
        if (id) {
            fetchDetail(id);
        }
    }, [id]);

    const fetchDetail = async (hotelId: string) => {
        try {
            setLoading(true);
            const res = await getHotelDetailApi(hotelId);
            if (res.code === 200) {
                setHotel(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">加载中...</div>;
    if (!hotel) return <div className="p-10 text-center">酒店不存在</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-[100px] relative">
            {/* 顶部沉浸式导航栏 (绝对定位覆盖在图片上) */}
            <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent">
                <div onClick={() => navigate(-1)} className="bg-black/20 p-2 rounded-full backdrop-blur-sm cursor-pointer">
                    <ChevronLeft size={24} />
                </div>
                <div className="flex gap-3">
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-sm"><Heart size={20} /></div>
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-sm"><Share2 size={20} /></div>
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-sm"><MoreHorizontal size={20} /></div>
                </div>
            </div>

            {/* 1. 头部信息区域 (Image 1) */}
            <HotelHeader hotel={hotel} />

            {/* 2. 房型列表区域 (Image 2) */}
            <RoomList
                onBook={handleBooking}
                rooms={hotel.roomTypes} />

            {/* 底部浮动栏 - 显示最低价或预订概览 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center z-50 safe-area-bottom pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">价格说明</span>
                    <div className="text-red-600 font-bold text-xl">
                        ¥{hotel.minPrice / 100}<span className="text-sm font-normal text-gray-500">起</span>
                    </div>
                </div>
                <Button className="bg-blue-600 px-8 py-6 rounded-lg text-lg font-bold">查看房型</Button>
            </div>
        </div>
    );
};

export default HotelDetailPage;