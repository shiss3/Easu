import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface HomeBannerDto {
    id: number;
    hotelId: number;
    imageUrl: string;
    title: string;
    subTitle?: string | null;
    linkUrl: string;
    trackCode?: string | null;
}

export interface HomeBannerProps {
    items: HomeBannerDto[];
    className?: string;
    autoPlayIntervalMs?: number; // 默认 5000
}

const DEFAULT_AUTOPLAY_MS = 5000;

export default function Banner(props: HomeBannerProps) {
    const { items, className, autoPlayIntervalMs = DEFAULT_AUTOPLAY_MS } = props;
    const navigate = useNavigate();

    const slides = useMemo<HomeBannerDto[]>(() => {
        // 兜底：没有数据时给一个占位 Slide，避免布局塌陷
        if (items.length > 0) return items;
        return [
            {
                id: 0,
                hotelId: 0,
                imageUrl: '',
                title: '精选酒店推荐',
                subTitle: '为你挑选高评分好店',
                linkUrl: '',
                trackCode: null,
            },
        ];
    }, [items]);

    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);
    const isInteractingRef = useRef(false);
    const resumeTimerRef = useRef<number | null>(null);

    const setActive = (idx: number) => {
        activeIndexRef.current = idx;
        setActiveIndex(idx);
    };

    const scrollToIndex = (idx: number) => {
        const el = viewportRef.current;
        if (!el) return;
        const width = el.clientWidth || 1;
        el.scrollTo({ left: idx * width, behavior: 'smooth' });
        setActive(idx);
    };

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const onScroll = () => {
            const width = el.clientWidth || 1;
            const idx = Math.round(el.scrollLeft / width);
            if (idx !== activeIndexRef.current) setActive(idx);
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [slides.length]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const markInteracting = () => {
            isInteractingRef.current = true;
            if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
        };
        const markNotInteractingLater = () => {
            if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = window.setTimeout(() => {
                isInteractingRef.current = false;
            }, 1200);
        };

        el.addEventListener('pointerdown', markInteracting, { passive: true });
        el.addEventListener('pointerup', markNotInteractingLater, { passive: true });
        el.addEventListener('pointercancel', markNotInteractingLater, { passive: true });
        el.addEventListener('mouseleave', markNotInteractingLater);

        return () => {
            if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
            el.removeEventListener('pointerdown', markInteracting);
            el.removeEventListener('pointerup', markNotInteractingLater);
            el.removeEventListener('pointercancel', markNotInteractingLater);
            el.removeEventListener('mouseleave', markNotInteractingLater);
        };
    }, []);

    useEffect(() => {
        if (slides.length <= 1) return;
        if (autoPlayIntervalMs <= 0) return;

        const id = window.setInterval(() => {
            if (isInteractingRef.current) return;
            const next = (activeIndexRef.current + 1) % slides.length;
            scrollToIndex(next);
        }, autoPlayIntervalMs);

        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides.length, autoPlayIntervalMs]);

    useEffect(() => {
        // 尺寸变化后，保持当前 active 的位置对齐
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const idx = activeIndexRef.current;
            const width = el.clientWidth || 1;
            el.scrollTo({ left: idx * width, behavior: 'auto' });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handleSlideClick = (item: HomeBannerDto) => {
        if (!item.hotelId) return;
        navigate(`/hotel/${item.hotelId}`);
    };

    return (
        <div className={cn('relative h-64 w-full overflow-hidden', className)} aria-roledescription="carousel">
            <div
                ref={viewportRef}
                className={cn(
                    'flex h-full w-full overflow-x-auto scroll-smooth',
                    'snap-x snap-mandatory',
                    // 隐藏滚动条（兼容多数浏览器）
                    '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                )}
            >
                {slides.map((item, idx) => (
                    <button
                        key={`${item.id}-${item.hotelId}-${idx}`}
                        type="button"
                        className={cn(
                            'relative h-full w-full shrink-0 snap-start text-left',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80'
                        )}
                        onClick={() => handleSlideClick(item)}
                        aria-label={`Banner ${idx + 1}`}
                    >
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-full w-full object-cover"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                            />
                        ) : (
                            <div className="h-full w-full bg-gradient-to-r from-amber-700 to-orange-500" />
                        )}

                        {/* 渐变遮罩：从上到下逐渐降低图片可视度（底部接近全遮住），用于与搜索卡片重叠区域的过渡 */}
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/0 via-white/60 to-white/95" />

                        {/* 文案：左上角偏中间 */}
                        <div className="pointer-events-none absolute left-4 top-10 right-14">
                            <div className="text-white text-3xl font-bold leading-tight drop-shadow-sm line-clamp-1">
                                {item.title}
                            </div>
                            {item.subTitle ? (
                                <div className="mt-2 inline-flex max-w-full rounded-full bg-black/35 px-3 py-1 text-sm text-yellow-300 border border-yellow-300/60 line-clamp-1">
                                    {item.subTitle}
                                </div>
                            ) : null}
                        </div>
                    </button>
                ))}
            </div>

            {/* 指示点：椭圆小图标 */}
            {slides.length > 1 ? (
                <div className="absolute bottom-20 right-1 -translate-x-1/2 flex items-center gap-2 z-10">
                    {slides.map((_, idx) => {
                        const active = idx === activeIndex;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => scrollToIndex(idx)}
                                className={cn(
                                    'transition-colors',
                                    'h-2 w-2 rounded-full shadow-sm',
                                    active ? 'bg-white' : 'bg-zinc-300/80'
                                )}
                                aria-label={`跳转到第 ${idx + 1} 张`}
                            />
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

