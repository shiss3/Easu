import { useQuery } from '@tanstack/react-query';
import { getSearchSuggestionsApi, type SuggestionItem } from '@/services/hotel-search';

/**
 * 联想搜索 Hook —— 基于 React Query 管理请求状态。
 *
 * @param keyword  已防抖后的搜索关键词（由调用方负责 debounce）。
 *                 空字符串时自动跳过请求并返回空数组。
 */
export function useSearchSuggestions(keyword: string) {
    const trimmed = keyword.trim();

    return useQuery<SuggestionItem[]>({
        queryKey: ['searchSuggestions', trimmed],
        queryFn: async () => {
            if (!trimmed) return [];
            const res = await getSearchSuggestionsApi(trimmed);
            return (res as any).data ?? [];
        },
        enabled: trimmed.length > 0,
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    });
}
