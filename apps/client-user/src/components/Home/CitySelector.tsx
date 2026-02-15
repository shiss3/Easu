import { useCallback, useEffect, useRef, useState } from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '@/lib/utils';
import { getRegeoLocationApi, type RegeoLocationData } from '@/services/location';
import { getCitiesApi, type CitiesData } from '@/services/city';

/* ---------- 类型 ---------- */
export interface CitySelectResult {
    city: string;
    location?: { lat: number; lng: number; name: string };
}

interface CitySelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (result: CitySelectResult) => void;
}

/* ---------- LocalStorage Key ---------- */
const HISTORY_KEY = 'history_city_search';

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
    const list = readHistory().filter((c) => c !== city);
    list.unshift(city);
    writeHistory(list);
};

/* ---------- 组件 ---------- */
const CitySelector = ({ visible, onClose, onSelect }: CitySelectorProps) => {
    /* ---- 状态 ---- */
    const [keyword, setKeyword] = useState('');
    const [aiSearch, setAiSearch] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [locationData, setLocationData] = useState<RegeoLocationData | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    /* ---- 城市数据（从 API 获取） ---- */
    const [citiesData, setCitiesData] = useState<CitiesData | null>(null);
    const [citiesLoading, setCitiesLoading] = useState(false);

    /* ---- 动画控制 ---- */
    const [shouldRender, setShouldRender] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    /* ---- 加载历史 ---- */
    useEffect(() => {
        if (visible) {
            setHistory(readHistory());
        }
    }, [visible]);

    /* ---- 加载城市数据 ---- */
    useEffect(() => {
        if (!visible || citiesData) return;

        let cancelled = false;
        setCitiesLoading(true);

        getCitiesApi()
            .then((res) => {
                if (!cancelled) setCitiesData(res.data);
            })
            .catch((e) => {
                console.error('获取城市列表失败', e);
            })
            .finally(() => {
                if (!cancelled) setCitiesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [visible, citiesData]);

    /* ---- 获取当前定位 ---- */
    useEffect(() => {
        if (!visible || locationData) return;
        if (!navigator.geolocation) return;

        let cancelled = false;
        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (cancelled) return;
                try {
                    const res = await getRegeoLocationApi({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    if (!cancelled) {
                        setLocationData(res.data);
                    }
                } catch (e) {
                    console.error('定位逆地理失败', e);
                } finally {
                    if (!cancelled) setLocationLoading(false);
                }
            },
            (err) => {
                console.error('获取位置失败', err);
                if (!cancelled) setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    /* ---- 选择城市 ---- */
    const handleSelect = useCallback(
        (city: string, location?: CitySelectResult['location']) => {
            addHistory(city);
            onSelect({ city, location });
        },
        [onSelect],
    );

    /* ---- 清空历史 ---- */
    const clearHistory = () => {
        writeHistory([]);
        setHistory([]);
    };

    /* ---- 字母索引点击 ---- */
    const scrollToLetter = (letter: string) => {
        const target = letter === '热门' ? 'city-section-hot' : `city-letter-${letter}`;
        const el = document.getElementById(target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    /* ---- 从 API 拿到的数据 ---- */
    const hotCities = citiesData?.hotCities ?? [];
    const alphabet = citiesData?.alphabet ?? [];
    const allCities = citiesData?.allCities ?? {};

    /* ---- 搜索过滤 ---- */
    const filteredCities = keyword.trim()
        ? Object.entries(allCities).reduce<Record<string, string[]>>((acc, [letter, cities]) => {
              const matched = cities.filter((c) => c.includes(keyword.trim()));
              if (matched.length) acc[letter] = matched;
              return acc;
          }, {})
        : allCities;

    const isSearching = keyword.trim().length > 0;

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* 遮罩层 */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/40 transition-opacity duration-300',
                    animateIn ? 'opacity-100' : 'opacity-0',
                )}
                onClick={onClose}
            />

            {/* 弹窗本体 */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white flex flex-col transition-transform duration-300 ease-out',
                    animateIn ? 'translate-y-0' : 'translate-y-full',
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-2 pb-3">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                {/* ========== 头部: 搜索栏卡片 ========== */}
                <div className="px-4 pb-2">
                    <div className="bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-300">
                        {/* 第一行：返回箭头 + 输入框 */}
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
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="城市/区域/品牌/酒店"
                                    className="w-full bg-transparent text-lg outline-none placeholder:text-gray-400 pr-6"
                                />
                                {keyword && (
                                    <button
                                        type="button"
                                        onClick={() => setKeyword('')}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 第二行：AI 搜索 + 搜索按钮 */}
                        <div className="flex items-center justify-between mt-3">
                            {/* AI 搜索开关 - 胶囊容器 */}
                            <button
                                type="button"
                                onClick={() => setAiSearch(!aiSearch)}
                                className="inline-flex items-center gap-1.5 bg-white rounded-full pl-2.5 pr-1 py-1 border border-gray-200 shadow-sm"
                            >
                                <Sparkles size={15} className="text-indigo-500" />
                                <span className="text-sm font-medium text-gray-700">AI搜索</span>
                                {/* Toggle */}
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

                            {/* 搜索按钮 - 渐变蓝色胶囊 */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (keyword.trim()) handleSelect(keyword.trim());
                                }}
                                className="shrink-0 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-base font-semibold px-7 py-2 rounded-full active:opacity-90 transition-opacity shadow-md shadow-blue-200/50"
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                </div>

                {/* ========== 内容区域 (可滚动) ========== */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto relative pr-6">
                    <div className="px-4 pb-24">
                        {/* ---- Section A: 当前定位 ---- */}
                        <div className="pt-1 pb-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <MapPin size={14} className="text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">当前定位</span>
                            </div>
                            {locationLoading ? (
                                <div className="text-xs text-gray-400">正在定位中...</div>
                            ) : locationData ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Tag 1 - 区县 (蓝色填充) */}
                                    {(locationData.district || locationData.city) && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSelect(
                                                    (locationData.district || locationData.city || '').replace(
                                                        /(市|区|县|自治区)$/g,
                                                        '',
                                                    ),
                                                )
                                            }
                                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100 active:bg-blue-100 transition-colors"
                                        >
                                            <MapPin size={12} />
                                            {(locationData.district || locationData.city || '').replace(
                                                /(市|省|自治区|特别行政区)$/g,
                                                '',
                                            )}
                                        </button>
                                    )}
                                    {/* Tag 2 - POI 名称 (白底蓝边) */}
                                    {locationData.poiName && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSelect(
                                                    (locationData.district || locationData.city || '').replace(
                                                        /(市|省|自治区|特别行政区)$/g,
                                                        '',
                                                    ),
                                                    {
                                                        lat: 0,
                                                        lng: 0,
                                                        name: locationData.poiName!,
                                                    },
                                                )
                                            }
                                            className="inline-flex items-center gap-1 bg-white text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-300 active:bg-blue-50 transition-colors"
                                        >
                                            {locationData.poiName}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400">无法获取定位信息</div>
                            )}
                        </div>

                        {/* ---- Section B: 历史搜索 ---- */}
                        {history.length > 0 && (
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
                        )}

                        {citiesLoading ? (
                            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                                加载中...
                            </div>
                        ) : (
                            <>
                                {/* ---- Section C: 国内热门城市 ---- */}
                                {!isSearching && (
                                    <div id="city-section-hot" className="py-3 border-t border-gray-100">
                                        <div className="text-base font-medium text-gray-800 mb-3">国内热门城市</div>
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
                                )}

                                {/* ---- Section D: 字母分组城市列表（一行一个城市） ---- */}
                                <div className="pt-2">
                                    {isSearching && Object.keys(filteredCities).length === 0 ? (
                                        <div className="text-center text-gray-400 text-sm py-8">
                                            未找到匹配的城市
                                        </div>
                                    ) : (
                                        Object.entries(filteredCities).map(([letter, cities]) => (
                                            <div key={letter} id={`city-letter-${letter}`}>
                                                {/* 字母标题 */}
                                                <div className="sticky top-0 bg-white text-base font-medium text-gray-800 py-2 z-[1]">
                                                    {letter}
                                                </div>
                                                {/* 城市列表：一行一个 */}
                                                <div>
                                                    {cities.map((city) => (
                                                        <button
                                                            key={city}
                                                            type="button"
                                                            onClick={() => handleSelect(city)}
                                                            className="w-full text-left text-gray-800 font-medium text-[15px] py-3.5 border-b border-gray-100 last:border-b-0 active:bg-gray-50 transition-colors"
                                                        >
                                                            {city}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ---- 右侧索引导航（热门 + A-Z） ---- */}
                    {!isSearching && (
                        <div className="fixed right-1 top-1/2 -translate-y-1/2 z-[101] flex flex-col items-center">
                            {/* 热门 */}
                            <button
                                type="button"
                                onClick={() => scrollToLetter('热门')}
                                className="text-[10px] text-blue-600 font-medium leading-tight py-0.5 active:text-blue-800"
                            >
                                热门
                            </button>
                            {/* A-Z */}
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default CitySelector;
