import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useSearchStore } from '@/store/searchStore';
import type { IntentSignal, IntentType, TriggerReason } from '@/types/intent';
import type { ClassifyResult } from '@/hooks/useClientAI';

/* ── Constants ────────────────────────────────────────────────────────── */

const DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_CITY = '上海';
const DWELL_POLL_INTERVAL = 3_000;
const AUTO_DISMISS_MS = 12_000;

/* ── Options ──────────────────────────────────────────────────────────── */

export interface UseUserIntentOptions {
    page: 'home' | 'search';
    enabled?: boolean;
    baseCooldown?: number;
    dismissCooldown?: number;
    formThreshold?: number;
    dwellThreshold?: number;
    classify?: (text: string, labels?: string[]) => Promise<ClassifyResult>;
    aiReady?: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function getDefaultDateRange() {
    const today = dayjs().startOf('day');
    return {
        start: today.format(DATE_FORMAT),
        end: today.add(1, 'day').format(DATE_FORMAT),
    };
}

/**
 * 对比当前 searchStore 状态与默认值，返回已填写（非默认）的字段列表。
 */
function computeNonDefaultFields(state: {
    city: string;
    dateRange: { start: string; end: string };
    keyword: string;
    filters: { minPrice?: number | null; maxPrice?: number | null; stars?: string[] };
    coords: { lat: number; lng: number } | null;
}): string[] {
    const fields: string[] = [];
    const defaults = getDefaultDateRange();

    if (state.city !== DEFAULT_CITY) fields.push('city');
    if (state.dateRange.start !== defaults.start || state.dateRange.end !== defaults.end) {
        fields.push('date');
    }
    if (state.keyword.trim()) fields.push('keyword');
    if (state.filters.minPrice != null || state.filters.maxPrice != null) fields.push('price');
    if (state.filters.stars?.length) fields.push('stars');
    if (state.coords) fields.push('location');

    return fields;
}

function inferIntentType(fields: string[]): IntentType {
    if (fields.includes('price') || fields.includes('stars')) return 'price_compare';
    return 'hotel_search';
}

function generateMessage(fields: string[], city: string, keyword: string): string {
    if (fields.includes('keyword') && keyword) {
        return `想找「${keyword}」相关的酒店？让 AI 帮你筛选整理`;
    }
    if (fields.includes('city') && fields.includes('date')) {
        return `看起来你在找${city}的酒店，需要 AI 帮你智能推荐吗？`;
    }
    if (fields.includes('city')) {
        return `要去${city}？让 AI 帮你挑选合适的酒店`;
    }
    if (fields.includes('price') || fields.includes('stars')) {
        return '已设置筛选条件，需要 AI 帮你对比推荐吗？';
    }
    return '需要 AI 帮你找到最合适的酒店吗？';
}

function buildContextDescription(fields: string[], city: string, keyword: string): string {
    const parts: string[] = [];
    if (fields.includes('city')) parts.push(`looking for hotels in ${city}`);
    if (fields.includes('date')) parts.push('selected travel dates');
    if (fields.includes('keyword')) parts.push(`searching for "${keyword}"`);
    if (fields.includes('price')) parts.push('filtering by price range');
    if (fields.includes('stars')) parts.push('filtering by star rating');
    if (fields.includes('location')) parts.push('searching nearby location');
    return `User is ${parts.join(', ')} on a hotel booking app`;
}

function mapClassifyLabel(label: string): IntentType {
    if (label.includes('comparing')) return 'price_compare';
    if (label.includes('searching')) return 'hotel_search';
    return 'hotel_search';
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useUserIntent(options: UseUserIntentOptions) {
    const {
        page,
        enabled = true,
        baseCooldown = 3_000,
        dismissCooldown = 10_000,
        formThreshold = 1,
        dwellThreshold = 5_000,
        classify,
        aiReady = false,
    } = options;

    const [intent, setIntent] = useState<IntentSignal | null>(null);

    const mountTimeRef = useRef(Date.now());
    const cooldownEndRef = useRef(0);
    const servedIntentsRef = useRef(new Set<IntentType>());
    const hasInteractedRef = useRef(false);
    const intentRef = useRef(intent);
    intentRef.current = intent;

    // 页面切换时重置行为计数
    useEffect(() => {
        mountTimeRef.current = Date.now();
        hasInteractedRef.current = false;
        setIntent(null);
    }, [page]);

    const tryTrigger = useCallback(
        (fields: string[], trigger: TriggerReason) => {
            if (!enabled) return;
            if (intentRef.current) return;
            if (Date.now() < cooldownEndRef.current) return;

            const type = inferIntentType(fields);
            if (servedIntentsRef.current.has(type)) return;

            const state = useSearchStore.getState();
            setIntent({
                type,
                confidence: Math.min(0.5 + fields.length * 0.15, 0.95),
                context: {
                    city: state.city,
                    dateRange: { ...state.dateRange },
                    keyword: state.keyword,
                    filledFields: fields,
                    currentPage: page,
                },
                trigger,
                message: generateMessage(fields, state.city, state.keyword),
            });

            cooldownEndRef.current = Date.now() + baseCooldown;
        },
        [enabled, page, baseCooldown],
    );

    // ── 表单填写触发：订阅 searchStore 变化 ────────────────────────
    useEffect(() => {
        if (!enabled) return;

        return useSearchStore.subscribe((state) => {
            hasInteractedRef.current = true;

            const fields = computeNonDefaultFields({
                city: state.city,
                dateRange: state.dateRange,
                keyword: state.keyword,
                filters: state.filters,
                coords: state.coords,
            });

            if (fields.length >= formThreshold) {
                tryTrigger(fields, 'form_filled');
            }
        });
    }, [enabled, formThreshold, tryTrigger]);

    // ── 停留时间触发：有交互 + 超过阈值 ─────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const timer = setInterval(() => {
            if (intentRef.current) return;
            if (!hasInteractedRef.current) return;

            const elapsed = Date.now() - mountTimeRef.current;
            if (elapsed < dwellThreshold) return;

            const state = useSearchStore.getState();
            const fields = computeNonDefaultFields({
                city: state.city,
                dateRange: state.dateRange,
                keyword: state.keyword,
                filters: state.filters,
                coords: state.coords,
            });

            if (fields.length > 0) {
                tryTrigger(fields, 'dwell_time');
            }
        }, DWELL_POLL_INTERVAL);

        return () => clearInterval(timer);
    }, [enabled, dwellThreshold, tryTrigger]);

    // ── 端侧 AI 增强：对规则引擎产生的意图做异步分类精化 ────────────
    useEffect(() => {
        if (!intent || intent.enhancedByAI || !aiReady || !classify) return;

        let cancelled = false;
        const ctx = intent.context;
        const text = buildContextDescription(ctx.filledFields, ctx.city, ctx.keyword);

        classify(text).then(result => {
            if (cancelled) return;
            setIntent(prev => {
                if (!prev || prev.enhancedByAI) return prev;
                return {
                    ...prev,
                    type: mapClassifyLabel(result.label),
                    confidence: result.score,
                    enhancedByAI: true,
                };
            });
        }).catch(() => {
            if (cancelled) return;
            setIntent(prev => prev ? { ...prev, enhancedByAI: true } : prev);
        });

        return () => { cancelled = true; };
    }, [intent, aiReady, classify]);

    // ── 自动消失：显示后超时未操作视为忽视 ────────────────────────────
    useEffect(() => {
        if (!intent) return;

        const timer = setTimeout(() => {
            setIntent(null);
            cooldownEndRef.current = Date.now() + dismissCooldown;
        }, AUTO_DISMISS_MS);

        return () => clearTimeout(timer);
    }, [intent, dismissCooldown]);

    // ── 用户主动关闭 → 2 分钟惩罚冷却 ──────────────────────────────
    const dismiss = useCallback(() => {
        setIntent(null);
        cooldownEndRef.current = Date.now() + dismissCooldown;
    }, [dismissCooldown]);

    // ── 用户接受 → 同类意图本次会话不再触发 ──────────────────────────
    const accept = useCallback(() => {
        const current = intentRef.current;
        if (current) {
            servedIntentsRef.current.add(current.type);
        }
        setIntent(null);
    }, []);

    return { intent, dismiss, accept } as const;
}

export { AUTO_DISMISS_MS };
