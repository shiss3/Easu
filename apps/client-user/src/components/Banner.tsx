import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';

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

    const slides = useMemo<HomeBannerDto[]>(() => items, [items]);
    const isEmpty = slides.length === 0;

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

    if (isEmpty) {
        return (
            <div className={cn('relative h-64 w-full overflow-hidden bg-gray-50', className)}>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-b from-transparent via-white/60 to-white/95" />
                <div className="flex flex-col gap-2 px-3 pt-3 h-full">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex bg-white rounded-lg overflow-hidden shadow-sm animate-pulse" style={{ height: 108 }}>
                            <div className="w-1/3 bg-gray-200" />
                            <div className="w-2/3 p-3 flex flex-col justify-between">
                                <div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="flex gap-0.5 mt-1.5">
                                        {[1, 2, 3].map((j) => (
                                            <div key={j} className="w-3 h-3 bg-gray-200 rounded-full" />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="h-4 bg-gray-200 rounded w-12" />
                                        <div className="h-3 bg-gray-200 rounded w-10" />
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded w-full mt-1.5" />
                                </div>
                                <div className="flex justify-end">
                                    <div className="h-6 bg-gray-200 rounded w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="text-center text-gray-400 text-sm animate-pulse mt-1">正在为您精选本地酒店</div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('relative h-64 w-full overflow-hidden', className)} aria-roledescription="carousel">
            <div
                ref={viewportRef}
                className={cn(
                    'flex h-full w-full overflow-x-auto scroll-smooth',
                    'snap-x snap-mandatory',
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
                        <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                        />

                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/0 via-white/60 to-white/95" />

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

