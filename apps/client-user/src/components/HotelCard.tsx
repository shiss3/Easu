import { useNavigate } from 'react-router-dom';
import Star from 'lucide-react/dist/esm/icons/star';
import type { HotelVo } from '@/services/hotel-search';

export const HotelCard = ({ data }: { data: HotelVo }) => {
    const navigate = useNavigate();

    const isFeatured = data.tags?.includes('精选') || data.tags?.includes('全国精选');
    const isRecommended = data.score >= 4.8;

    return (
        <div
            onClick={() => navigate(`/hotel/${data.id}`)}
            className="flex bg-white rounded-lg overflow-hidden shadow-sm h-full"
        >
            <div className="w-1/3 relative">
                <img
                    src={data.coverImage || 'https://placehold.co/200x300'}
                    alt={data.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                <div className="absolute top-0 left-0 flex flex-col items-start gap-0.5">
                    {isFeatured && (
                        <div className="bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                            精选
                        </div>
                    )}
                    {isRecommended && (
                        <div className="bg-amber-500 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                            推荐
                        </div>
                    )}
                </div>
            </div>

            <div className="w-2/3 p-3 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-base line-clamp-1">{data.name}</h3>
                    <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: data.star || 0 }).map((_, i) => (
                            <Star key={i} fill="currentColor" size={12} className="text-amber-400" />
                        ))}
                    </div>
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
                            <span
                                key={i}
                                className="text-[10px] text-blue-500 border border-blue-100 bg-blue-50 px-1 rounded"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end items-end gap-1">
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
