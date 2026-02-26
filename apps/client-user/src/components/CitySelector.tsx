import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Search from 'lucide-react/dist/esm/icons/search';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import X from 'lucide-react/dist/esm/icons/x';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { cn } from '@/lib/utils.ts';
import { useCityList } from '@/hooks/useHomeData.ts';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions.ts';
import type { SuggestionItem } from '@/services/hotel-search.ts';
import type { Coords, LocateStatus } from '@/store/searchStore.ts';
import { useSearchStore } from '@/store/searchStore.ts';

export interface CitySelectResult {
    city: string;
    location?: { lat: number; lng: number; name: string };
    keyword?: string;
}

interface CitySelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect?: (result: CitySelectResult) => void;
    initialKeyword?: string;
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

/* ---------- Suggestion list items ---------- */

const SuggestionCityItem = ({
    item,
    keyword,
    onSelect,
}: {
    item: SuggestionItem;
    keyword: string;
    onSelect: (city: string) => void;
}) => {
    const highlighted = highlightMatch(item.name, keyword);
    return (
        <button
            type="button"
            onClick={() => onSelect(item.city)}
            className="flex items-center gap-3 w-full px-1 py-3 border-b border-gray-100 active:bg-gray-50 transition-colors"
        >
            <div className="shrink-0 w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                <Search size={16} className="text-blue-500" />
            </div>
            <span className="text-[15px] text-gray-800 font-medium">{highlighted}</span>
        </button>
    );
};

const SuggestionHotelItem = ({
    item,
    keyword,
    onNavigate,
}: {
    item: SuggestionItem;
    keyword: string;
    onNavigate: (id: number) => void;
}) => {
    const highlighted = highlightMatch(item.name, keyword);
    const priceYuan = item.minPrice ? Math.round(item.minPrice) : null;

    return (
        <button
            type="button"
            onClick={() => onNavigate(item.id as number)}
            className="flex items-start gap-3 w-full px-1 py-3 border-b border-gray-100 active:bg-gray-50 transition-colors"
        >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mt-0.5">
                <Building2 size={16} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] text-gray-800 font-medium truncate">{highlighted}</span>
                    {priceYuan !== null && priceYuan > 0 && (
                        <span className="shrink-0 text-sm text-red-500 font-semibold">
                            ¥{priceYuan}<span className="text-xs font-normal">起</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {item.score != null && (
                        <span className="text-blue-600 font-medium">{item.score}分</span>
                    )}
                    {item.address && (
                        <span className="truncate">{item.address}</span>
                    )}
                </div>
            </div>
        </button>
    );
};

function highlightMatch(text: string, keyword: string) {
    if (!keyword) return text;
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="text-blue-600">{text.slice(idx, idx + keyword.length)}</span>
            {text.slice(idx + keyword.length)}
        </>
    );
}

const SuggestionList = ({
    suggestions,
    keyword,
    isLoading,
    onSelectCity,
    onNavigateHotel,
}: {
    suggestions: SuggestionItem[];
    keyword: string;
    isLoading: boolean;
    onSelectCity: (city: string) => void;
    onNavigateHotel: (id: number) => void;
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" />
                搜索中...
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="text-center text-gray-400 text-sm py-8">
                未找到相关结果
            </div>
        );
    }

    return (
        <div className="pt-1">
            {suggestions.map((item) =>
                item.type === 'CITY' ? (
                    <SuggestionCityItem
                        key={item.id}
                        item={item}
                        keyword={keyword}
                        onSelect={onSelectCity}
                    />
                ) : (
                    <SuggestionHotelItem
                        key={item.id}
                        item={item}
                        keyword={keyword}
                        onNavigate={onNavigateHotel}
                    />
                ),
            )}
        </div>
    );
};

/* ---------- Main component ---------- */

const CitySelector = ({ visible, onClose, onSelect, initialKeyword, currentLocation, onRequestLocation }: CitySelectorProps) => {
    const navigate = useNavigate();
    const setCity = useSearchStore((state) => state.setCity);
    const setCoords = useSearchStore((state) => state.setCoords);
    const setStoreKeyword = useSearchStore((state) => state.setKeyword);
    const storeCity = useSearchStore((state) => state.city);
    const storeDateRange = useSearchStore((state) => state.dateRange);
    const { data: citiesData, isLoading: citiesLoading } = useCityList();

    const [keyword, setKeyword] = useState('');
    const debouncedKeyword = useDebouncedValue(keyword);
    const [aiSearch, setAiSearch] = useState(false);
    const [inputError, setInputError] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [shouldRender, setShouldRender] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    const keywordText = debouncedKeyword.trim();
    const isSearching = keywordText.length > 0;

    const { data: suggestions, isLoading: suggestionsLoading } = useSearchSuggestions(debouncedKeyword);

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
            if (initialKeyword) {
                setKeyword(initialKeyword);
            }
        }
    }, [visible, initialKeyword]);

    const hotCities = useMemo(() => citiesData?.hotCities ?? [], [citiesData]);
    const alphabet = useMemo(() => citiesData?.alphabet ?? [], [citiesData]);
    const allCityGroups = useMemo(() => citiesData?.allCities ?? {}, [citiesData]);

    const flatRows = useMemo<CityRow[]>(() => {
        const rows: CityRow[] = [];
        Object.entries(allCityGroups).forEach(([letter, cities]) => {
            rows.push({
                type: 'header',
                key: `header-${letter}`,
                label: letter,
                domId: `city-letter-${letter}`,
            });
            cities.forEach((city, index) => {
                rows.push({
                    type: 'city',
                    key: `city-${letter}-${city}-${index}`,
                    city,
                });
            });
        });
        return rows;
    }, [allCityGroups]);

    const handleSelect = useCallback(
        (city: string, location?: CitySelectResult['location'], type: 'city' | 'keyword' = 'city') => {
            const safeValue = city.trim();
            if (!safeValue) return;

            if (type === 'keyword') {
                if (onSelect) {
                    onSelect({ city: safeValue, keyword: safeValue });
                } else {
                    setStoreKeyword(safeValue);
                }
                setKeyword('');
                onClose();
                return;
            }

            addHistory(safeValue);
            setHistory(readHistory());
            if (onSelect) {
                onSelect({ city: safeValue, location });
            } else {
                setCity(safeValue);
                setStoreKeyword('');
                if (location) {
                    setCoords({ lat: location.lat, lng: location.lng });
                } else {
                    setCoords(null);
                }
            }
            setKeyword('');
            onClose();
        },
        [onClose, onSelect, setCity, setCoords, setStoreKeyword],
    );

    const handleNavigateHotel = useCallback(
        (hotelId: number) => {
            setKeyword('');
            onClose();
            navigate(`/hotel/${hotelId}`);
        },
        [navigate, onClose],
    );

    const clearHistory = () => {
        writeHistory([]);
        setHistory([]);
    };

    const handleExecuteSearch = useCallback(() => {
        if (!keywordText) {
            setInputError(true);
            setTimeout(() => setInputError(false), 500);
            return;
        }

        if (aiSearch) {
            const prompt = `我想在${storeCity}找酒店，入住时间是${storeDateRange.start}到${storeDateRange.end}。我的额外要求是：${keywordText}。请帮我推荐合适的酒店。`;
            const encodedPrompt = encodeURIComponent(prompt);
            setKeyword('');
            onClose();
            navigate('/ai-assistant?prompt=' + encodedPrompt);
            return;
        }

        handleSelect(keywordText, undefined, 'keyword');
    }, [keywordText, aiSearch, storeCity, storeDateRange, handleSelect, onClose, navigate]);

    const scrollToLetter = (letter: string) => {
        const targetId = letter === '热门' ? 'city-section-hot' : `city-letter-${letter}`;
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (!shouldRender) return null;

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
                    'absolute inset-x-0 bottom-0 h-[90vh] rounded-t-2xl bg-white flex flex-col transition-transform duration-300 ease-out',
                    animateIn ? 'translate-y-0' : 'translate-y-full',
                )}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex justify-center pt-2 pb-3">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                <div className="px-4 pb-2">
                    <div className={cn(
                        'rounded-2xl px-3 py-3 shadow-sm border transition-all duration-300',
                        inputError
                            ? 'bg-white border-red-500 ring-1 ring-red-500'
                            : aiSearch
                                ? 'bg-blue-50/50 border-blue-400 shadow-blue-100'
                                : 'bg-white border-gray-300',
                    )}>
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
                                    onKeyDown={(event) => { if (event.key === 'Enter') handleExecuteSearch(); }}
                                    placeholder="城市/品牌/酒店/酒店设施"
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
                                onClick={handleExecuteSearch}
                                className="shrink-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-base font-semibold px-7 py-2 rounded-full active:opacity-90 transition-opacity shadow-md shadow-blue-200/50"
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto relative pr-6">
                    <div className="px-4 pb-24">
                        {/* 当前定位 */}
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

                        {/* 历史搜索 */}
                        {!isSearching && history.length > 0 ? (
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

                        {/* 搜索模式：显示联想结果 / 非搜索模式：显示城市列表 */}
                        {isSearching ? (
                            <div className="border-t border-gray-100">
                                <SuggestionList
                                    suggestions={suggestions ?? []}
                                    keyword={keywordText}
                                    isLoading={suggestionsLoading}
                                    onSelectCity={(city) => handleSelect(city, undefined, 'keyword')}
                                    onNavigateHotel={handleNavigateHotel}
                                />
                            </div>
                        ) : citiesLoading ? (
                            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                                加载中...
                            </div>
                        ) : (
                            <>
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

                    {/* 字母侧边栏 (仅在非搜索模式) */}
                    {!isSearching ? (
                        <div className="fixed right-1 top-[60%] -translate-y-1/2 z-[101] flex flex-col items-center">
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
