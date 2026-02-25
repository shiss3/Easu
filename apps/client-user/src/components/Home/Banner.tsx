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
            <div className={cn('relative h-64 w-full overflow-hidden bg-gray-100', className)}>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-b from-transparent via-white/60 to-white/95" />
                <div className="absolute inset-0 flex flex-col items-center justify-center -mt-6 gap-3">
                    <svg viewBox="0 0 120 100" className="w-24 h-24 text-gray-300" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="30" width="100" height="60" rx="4" fill="currentColor" opacity="0.4" />
                        <rect x="20" y="10" width="50" height="80" rx="3" fill="currentColor" opacity="0.6" />
                        <rect x="28" y="22" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="44" y="22" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="28" y="38" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="44" y="38" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="28" y="54" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="44" y="54" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="33" y="72" width="20" height="18" rx="2" fill="currentColor" opacity="0.3" />
                        <rect x="78" y="45" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="94" y="45" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="78" y="61" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <rect x="94" y="61" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.25" />
                        <polygon points="20,10 45,0 70,10" fill="currentColor" opacity="0.5" />
                    </svg>
                    <span className="text-gray-400 text-sm tracking-wide animate-pulse">正在为您精选本地酒店</span>
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

