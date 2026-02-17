import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '@/lib/utils';
import { useCityList } from '@/hooks/useHomeData';
import type { Coords, LocateStatus } from '@/store/searchStore';
import { useSearchStore } from '@/store/searchStore';

export interface CitySelectResult {
    city: string;
    location?: { lat: number; lng: number; name: string };
}

interface CitySelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect?: (result: CitySelectResult) => void;
    currentLocation?: {
        status: LocateStatus;
        city?: string;
        addressHint?: string;
        coords?: Coords | null;
        errorMessage?: string;
    };
    onRequestLocation?: () => void | Promise<void>;
}

const HISTORY_KEY = 'history_city_search';
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 36;
// TODO: plug VirtualList from shared package. 当前阶段仅保留可插拔接口，不实现虚拟列表。

type CityRow =
    | { type: 'header'; key: string; label: string; domId?: string }
    | { type: 'city'; key: string; city: string };

const readHistory = (): string[] => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
};

const writeHistory = (list: string[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
};

const addHistory = (city: string) => {
    const next = readHistory().filter((item) => item !== city);
    next.unshift(city);
    writeHistory(next);
};

const useDebouncedValue = (value: string, delay = 220) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

const CityRows = ({
    rows,
    onSelectCity,
}: {
    rows: CityRow[];
    onSelectCity: (city: string) => void;
}) => {
    return (
        <div className="pt-2">
            {rows.map((row) =>
                row.type === 'header' ? (
                    <div
                        key={row.key}
                        id={row.domId}
                        className="sticky top-0 bg-white text-base font-medium text-gray-800 py-2 z-[1]"
                        style={{ height: HEADER_HEIGHT }}
                    >
                        {row.label}
                    </div>
                ) : (
                    <button
                        key={row.key}
                        type="button"
                        onClick={() => onSelectCity(row.city)}
                        className="w-full text-left text-gray-800 font-medium text-[15px] py-3.5 border-b border-gray-100 last:border-b-0 active:bg-gray-50 transition-colors"
                        style={{ minHeight: ROW_HEIGHT }}
                    >
                        {row.city}
                    </button>
                ),
            )}
        </div>
    );
};

const CitySelector = ({ visible, onClose, onSelect, currentLocation, onRequestLocation }: CitySelectorProps) => {
    const setCity = useSearchStore((state) => state.setCity);
    const setCoords = useSearchStore((state) => state.setCoords);
    const { data: citiesData, isLoading: citiesLoading } = useCityList();

    const [keyword, setKeyword] = useState('');
    const debouncedKeyword = useDebouncedValue(keyword);
    const [aiSearch, setAiSearch] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [shouldRender, setShouldRender] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
        } else {
            setAnimateIn(false);
            const timer = window.setTimeout(() => setShouldRender(false), 300);
            return () => window.clearTimeout(timer);
        }
    }, [visible]);

    useEffect(() => {
        if (visible) {
            setHistory(readHistory());
        }
    }, [visible]);

    const hotCities = useMemo(() => citiesData?.hotCities ?? [], [citiesData]);
    const alphabet = useMemo(() => citiesData?.alphabet ?? [], [citiesData]);
    const allCityGroups = useMemo(() => citiesData?.allCities ?? {}, [citiesData]);
    const keywordText = debouncedKeyword.trim();
    const isSearching = keywordText.length > 0;

    const filteredGroups = useMemo(() => {
        if (!keywordText) {
            return allCityGroups;
        }
        return Object.entries(allCityGroups).reduce<Record<string, string[]>>((acc, [letter, cities]) => {
            const matched = cities.filter((city) => city.includes(keywordText));
            if (matched.length > 0) {
                acc[letter] = matched;
            }
            return acc;
        }, {});
    }, [allCityGroups, keywordText]);

    const flatRows = useMemo<CityRow[]>(() => {
        const rows: CityRow[] = [];
        Object.entries(filteredGroups).forEach(([letter, cities]) => {
            rows.push({
                type: 'header',
                key: `header-${letter}`,
                label: letter,
                domId: `city-letter-${letter}`,
            });
            cities.forEach((city) => {
                rows.push({
                    type: 'city',
                    key: `city-${letter}-${city}`,
                    city,
                });
            });
        });
        return rows;
    }, [filteredGroups]);

    const handleSelect = useCallback(
        (city: string, location?: CitySelectResult['location']) => {
            const safeCity = city.trim();
            if (!safeCity) {
                return;
            }
            addHistory(safeCity);
            setHistory(readHistory());
            setCity(safeCity);
            if (location) {
                setCoords({ lat: location.lat, lng: location.lng });
            } else {
                setCoords(null);
            }
            onSelect?.({ city: safeCity, location });
            onClose();
        },
        [onClose, onSelect, setCity, setCoords],
    );

    const clearHistory = () => {
        writeHistory([]);
        setHistory([]);
    };

    const scrollToLetter = (letter: string) => {
        const targetId = letter === '热门' ? 'city-section-hot' : `city-letter-${letter}`;
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!shouldRender) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100]">
            <div
                className={cn(
                    'absolute inset-0 bg-black/40 transition-opacity duration-300',
                    animateIn ? 'opacity-100' : 'opacity-0',
                )}
                onClick={onClose}
            />
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white flex flex-col transition-transform duration-300 ease-out',
                    animateIn ? 'translate-y-0' : 'translate-y-full',
                )}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex justify-center pt-2 pb-3">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="px-4 pb-2">
                    <div className="bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-300">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 p-1 -ml-1 text-gray-700"
                            >
                                <ChevronLeft size={24} strokeWidth={2.5} />
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    placeholder="城市/区域/景点/品牌/酒店"
                                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 pr-6"
                                />
                                {keyword ? (
                                    <button
                                        type="button"
                                        onClick={() => setKeyword('')}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        <X size={16} />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                            <button
                                type="button"
                                onClick={() => setAiSearch((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 bg-white rounded-full pl-2.5 pr-1 py-1 border border-gray-200 shadow-sm"
                            >
                                <Sparkles size={15} className="text-indigo-500" />
                                <span className="text-sm font-medium text-gray-700">AI搜索</span>
                                <div
                                    role="switch"
                                    aria-checked={aiSearch}
                                    className={cn(
                                        'relative inline-flex h-[22px] w-[40px] items-center rounded-full transition-colors duration-200 ml-0.5',
                                        aiSearch ? 'bg-blue-600' : 'bg-gray-300',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200',
                                            aiSearch ? 'translate-x-[20px]' : 'translate-x-[2px]',
                                        )}
                                    />
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelect(keywordText)}
                                className="shrink-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-base font-semibold px-7 py-2 rounded-full active:opacity-90 transition-opacity shadow-md shadow-blue-200/50"
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto relative pr-6">
                    <div className="px-4 pb-24">
                        <div className="pt-1 pb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="text-sm font-medium text-gray-700">当前定位</span>
                            </div>
                            {currentLocation?.status === 'locating' || currentLocation?.status === 'geocoding' ? (
                                <div className="text-xs text-gray-400">正在定位中...</div>
                            ) : currentLocation?.status === 'success' && currentLocation.city ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSelect(currentLocation.city ?? '', currentLocation.coords
                                                ? {
                                                      lat: currentLocation.coords.lat,
                                                      lng: currentLocation.coords.lng,
                                                      name: currentLocation.addressHint || currentLocation.city || '',
                                                  }
                                                : undefined)
                                        }
                                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100 active:bg-blue-100 transition-colors"
                                    >
                                        <MapPin size={12} />
                                        {currentLocation.addressHint || currentLocation.city}
                                    </button>
                                </div>
                            ) : currentLocation?.status === 'error' ? (
                                <button
                                    type="button"
                                    onClick={() => void onRequestLocation?.()}
                                    className="text-xs text-blue-600"
                                >
                                    {currentLocation.errorMessage || '定位失败，点击重试'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void onRequestLocation?.()}
                                    className="text-xs text-blue-600"
                                >
                                    点击获取当前位置
                                </button>
                            )}
                        </div>

                        {history.length > 0 ? (
                            <div className="py-3 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">历史搜索</span>
                                    <button
                                        type="button"
                                        onClick={clearHistory}
                                        className="text-gray-400 active:text-gray-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {history.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => handleSelect(item)}
                                            className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full active:bg-gray-200 transition-colors"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {citiesLoading ? (
                            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                                加载中...
                            </div>
                        ) : (
                            <>
                                {!isSearching ? (
                                    <div id="city-section-hot" className="py-3 border-t border-gray-100">
                                        <div className="text-sm font-medium text-gray-700 mb-3">热门城市</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {hotCities.map((city) => (
                                                <button
                                                    key={city}
                                                    type="button"
                                                    onClick={() => handleSelect(city)}
                                                    className="bg-gray-100 text-gray-800 text-sm py-2 rounded-lg text-center active:bg-gray-200 active:text-gray-900 transition-colors"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {flatRows.length === 0 ? (
                                    <div className="text-center text-gray-400 text-sm py-8">
                                        未找到匹配的城市
                                    </div>
                                ) : (
                                    <CityRows rows={flatRows} onSelectCity={handleSelect} />
                                )}
                            </>
                        )}
                    </div>
                    {!isSearching ? (
                        <div className="fixed right-1 top-1/2 -translate-y-1/2 z-[101] flex flex-col items-center">
                            <button
                                type="button"
                                onClick={() => scrollToLetter('热门')}
                                className="text-[10px] text-blue-600 font-medium leading-tight py-0.5 active:text-blue-800"
                            >
                                热门
                            </button>
                            {alphabet.map((letter) => (
                                <button
                                    key={letter}
                                    type="button"
                                    onClick={() => scrollToLetter(letter)}
                                    className="text-[11px] text-blue-600 font-medium w-5 h-[18px] flex items-center justify-center active:bg-blue-100 active:rounded-full"
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default CitySelector;
