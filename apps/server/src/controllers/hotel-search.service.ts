import { prisma } from '@repo/database';
import { z } from 'zod';
import dayjs from 'dayjs';

// ── Zod Schema ──────────────────────────────────────────────────────────

const searchSchema = z.object({
    city: z.string().optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    guestCount: z.number().int().min(1).optional(),
    rooms: z.number().int().min(1).optional(),
    hasWindow: z.boolean().optional(),
    hasBreakfast: z.boolean().optional(),
    childrenFriendly: z.boolean().optional(),
    keyword: z.string().optional(),
    minPrice: z.number().int().min(0).optional().nullable(),
    maxPrice: z.number().int().min(0).optional().nullable(),
    sort: z.enum(['default', 'rating', 'price_low', 'price_high']).optional(),
    cursor: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(50).optional(),
});

// ── Constants & Helpers ─────────────────────────────────────────────────

const PG_INT4_MAX = 2147483647;

function safeInt(val: unknown, fallback: number, min = 0, max = PG_INT4_MAX): number {
    if (val === null || val === undefined) return fallback;
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
}

function safeBool(val: unknown): boolean {
    if (val === true || val === 'true' || val === 1) return true;
    return false;
}

function getOrderByClause(sort: string): string {
    switch (sort) {
        case 'price_low':
            return 'min_price ASC, relevance_score DESC, h."sortOrder" ASC';
        case 'price_high':
            return 'min_price DESC, relevance_score DESC, h."sortOrder" ASC';
        case 'rating':
            return '(h.score * LOG((h."reviewCount" + 10)::numeric)) DESC, relevance_score DESC, h."sortOrder" ASC';
        default:
            return 'relevance_score DESC, h."sortOrder" ASC, h.score DESC, h."reviewCount" DESC';
    }
}

// ── Raw Row Interface ───────────────────────────────────────────────────

interface RawHotelRow {
    id: number;
    name: string;
    address: string;
    city: string;
    cover_image: string;
    images: string[];
    tags: string[];
    price_desc: string | null;
    score: number;
    review_count: number;
    sort_order: number;
    min_price: number;
    relevance_score: number;
}

// ── Return Types ────────────────────────────────────────────────────────

interface HotelVo {
    id: number;
    name: string;
    address: string;
    city: string;
    coverImage: string;
    tags: string[];
    priceDesc: string | null;
    score: number;
    reviewCount: number;
    minPrice: number;
    isFallback: boolean;
}

interface AiContextItem {
    id: number;
    name: string;
    minPrice: number;
    tags: string[];
}

export interface HotelSearchResult {
    exactMatches: HotelVo[];
    recommendations: HotelVo[];
    nextCursor: number | null;
    total: number;
    aiContext: AiContextItem[];
}

// ── Custom Error for Validation ─────────────────────────────────────────

export class SearchValidationError extends Error {
    errors: string[];
    constructor(message: string, errors: string[]) {
        super(message);
        this.name = 'SearchValidationError';
        this.errors = errors;
    }
}

// ── SQL Builders ────────────────────────────────────────────────────────

/**
 * 硬约束完整查询 (14 params):
 * $1 = checkInDate, $2 = checkOutDate, $3 = rooms, $4 = guestCount,
 * $5 = city, $6 = keyword,
 * $7 = hasWindow, $8 = hasBreakfast, $9 = childrenFriendly,
 * $10 = minPrice, $11 = maxPrice,
 * $12 = limit, $13 = offset, $14 = nightCount
 */
function buildExactQuery(sort: string): string {
    const orderBy = getOrderByClause(sort);
    return `
WITH available_room_types AS (
    SELECT
        rt.id AS room_type_id,
        rt."hotelId" AS hotel_id,
        COALESCE(MIN(COALESCE(ri.price, rt.price)), rt.price) AS effective_price
    FROM "RoomType" rt
    INNER JOIN "RoomInventory" ri ON ri."roomTypeId" = rt.id
    WHERE
        ri.date >= $1::timestamp
        AND ri.date < $2::timestamp
        AND ri.quota >= $3::int
        AND rt.capacity >= $4::int
    GROUP BY rt.id, rt."hotelId", rt.price
    HAVING COUNT(ri.id) >= $14::int
),
hotel_min_price AS (
    SELECT
        art.hotel_id,
        MIN(art.effective_price) AS min_price
    FROM available_room_types art
    GROUP BY art.hotel_id
),
room_type_features AS (
    SELECT
        art.hotel_id,
        BOOL_OR(rt2."hasWindow") AS any_window,
        BOOL_OR(rt2."hasBreakfast") AS any_breakfast,
        BOOL_OR(rt2."childrenFriendly") AS any_children
    FROM available_room_types art
    INNER JOIN "RoomType" rt2 ON rt2.id = art.room_type_id
    GROUP BY art.hotel_id
)
SELECT
    h.id,
    h.name,
    h.address,
    h.city,
    h."coverImage" AS cover_image,
    h.images,
    h.tags,
    h."priceDesc" AS price_desc,
    h.score,
    h."reviewCount" AS review_count,
    h."sortOrder" AS sort_order,
    hmp.min_price,
    (
        CASE WHEN $7::boolean AND COALESCE(rtf.any_window, false) THEN 20 ELSE 0 END
        + CASE WHEN $8::boolean AND COALESCE(rtf.any_breakfast, false) THEN 15 ELSE 0 END
        + CASE WHEN $9::boolean AND COALESCE(rtf.any_children, false) THEN 10 ELSE 0 END
        + CASE WHEN LENGTH($6::text) > 0 THEN
            (word_similarity(h.name, $6::text) * 30)::int
          ELSE 0 END
    ) AS relevance_score
FROM "Hotel" h
INNER JOIN hotel_min_price hmp ON hmp.hotel_id = h.id
LEFT JOIN room_type_features rtf ON rtf.hotel_id = h.id
WHERE
    h.status = 1
    AND ($5::text = '' OR h.city = $5::text)
    AND ($6::text = '' OR h.name ILIKE '%' || $6::text || '%' OR h.city ILIKE '%' || $6::text || '%' OR array_to_string(h.tags, ',') ILIKE '%' || $6::text || '%')
    AND (
        ($10::int = 0 AND $11::int >= ${PG_INT4_MAX})
        OR (hmp.min_price BETWEEN $10::int AND $11::int)
    )
ORDER BY ${orderBy}
LIMIT $12::int
OFFSET $13::int
`;
}

/**
 * 兜底降级查询 (10 params，不检查库存):
 * 使用 LEFT JOIN 保证即使没有房型的酒店也能被查出来。
 * $1 = city, $2 = keyword, $3 = guestCount,
 * $4 = minPrice, $5 = maxPrice,
 * $6 = hasWindow, $7 = hasBreakfast, $8 = childrenFriendly,
 * $9 = limit, $10 = offset
 */
function buildFallbackQuery(sort: string): string {
    const orderBy = getOrderByClause(sort);
    return `
WITH hotel_room_info AS (
    SELECT
        rt."hotelId" AS hotel_id,
        MIN(rt.price) AS min_price,
        MAX(rt.capacity) AS max_capacity,
        BOOL_OR(rt."hasWindow") AS any_window,
        BOOL_OR(rt."hasBreakfast") AS any_breakfast,
        BOOL_OR(rt."childrenFriendly") AS any_children
    FROM "RoomType" rt
    GROUP BY rt."hotelId"
)
SELECT
    h.id,
    h.name,
    h.address,
    h.city,
    h."coverImage" AS cover_image,
    h.images,
    h.tags,
    h."priceDesc" AS price_desc,
    h.score,
    h."reviewCount" AS review_count,
    h."sortOrder" AS sort_order,
    COALESCE(hri.min_price, 0) AS min_price,
    (
        CASE WHEN $6::boolean AND COALESCE(hri.any_window, false) THEN 20 ELSE 0 END
        + CASE WHEN $7::boolean AND COALESCE(hri.any_breakfast, false) THEN 15 ELSE 0 END
        + CASE WHEN $8::boolean AND COALESCE(hri.any_children, false) THEN 10 ELSE 0 END
        + CASE WHEN LENGTH($2::text) > 0 THEN
            (word_similarity(h.name, $2::text) * 30)::int
          ELSE 0 END
    ) AS relevance_score
FROM "Hotel" h
LEFT JOIN hotel_room_info hri ON hri.hotel_id = h.id
WHERE
    h.status = 1
    AND ($1::text = '' OR h.city ILIKE '%' || $1::text || '%')
    AND ($2::text = '' OR h.name ILIKE '%' || $2::text || '%' OR h.city ILIKE '%' || $2::text || '%' OR array_to_string(h.tags, ',') ILIKE '%' || $2::text || '%')
    AND (
        ($4::int = 0 AND $5::int >= ${PG_INT4_MAX})
        OR (COALESCE(hri.min_price, 0) BETWEEN $4::int AND $5::int)
    )
    AND ($3::int <= 1 OR COALESCE(hri.max_capacity, 99) >= $3::int)
ORDER BY ${orderBy}
LIMIT $9::int
OFFSET $10::int
`;
}

/**
 * 全局兜底查询 (4 params，带可选城市约束):
 * 当精确查询和降级查询均无结果时，返回热门酒店。
 * $1 = keyword, $2 = limit, $3 = offset, $4 = city
 */
function buildGlobalFallbackQuery(sort: string): string {
    const orderBy = getOrderByClause(sort);
    return `
WITH hotel_min_prices AS (
    SELECT rt."hotelId" AS hotel_id, MIN(rt.price) AS min_price
    FROM "RoomType" rt
    GROUP BY rt."hotelId"
)
SELECT
    h.id,
    h.name,
    h.address,
    h.city,
    h."coverImage" AS cover_image,
    h.images,
    h.tags,
    h."priceDesc" AS price_desc,
    h.score,
    h."reviewCount" AS review_count,
    h."sortOrder" AS sort_order,
    COALESCE(hmp.min_price, 0) AS min_price,
    CASE WHEN LENGTH($1::text) > 0 THEN
        (word_similarity(h.name, $1::text) * 30)::int
    ELSE 0 END AS relevance_score
FROM "Hotel" h
LEFT JOIN hotel_min_prices hmp ON hmp.hotel_id = h.id
WHERE h.status = 1
    AND ($4::text = '' OR h.city = $4::text)
ORDER BY ${orderBy}
LIMIT $2::int
OFFSET $3::int
`;
}

// ── Core Search Function ────────────────────────────────────────────────

export async function executeHotelSearch(rawParams: unknown): Promise<HotelSearchResult> {
    const parsed = searchSchema.safeParse(rawParams);
    if (!parsed.success) {
        throw new SearchValidationError(
            '参数错误',
            parsed.error.issues.map(e => e.message),
        );
    }

    const {
        city,
        checkIn,
        checkOut,
        keyword,
        sort,
    } = parsed.data;

    const guestCount = safeInt(parsed.data.guestCount, 1, 1, 99);
    const rooms = safeInt(parsed.data.rooms, 1, 1, 99);
    const rawMinPrice = safeInt(parsed.data.minPrice, 0, 0);
    const rawMaxPrice = safeInt(parsed.data.maxPrice, 0, 0);
    const pMinPrice = rawMinPrice > 0 ? rawMinPrice * 100 : 0;
    const pMaxPrice = rawMaxPrice > 0 ? rawMaxPrice * 100 : PG_INT4_MAX;
    const cursor = safeInt(parsed.data.cursor, 0, 0);
    const limit = safeInt(parsed.data.limit, 20, 1, 50);

    const pHasWindow = safeBool(parsed.data.hasWindow);
    const pHasBreakfast = safeBool(parsed.data.hasBreakfast);
    const pChildrenFriendly = safeBool(parsed.data.childrenFriendly);
    const pCity = (city ?? '').trim();
    const pKeyword = (keyword ?? '').trim();
    const pSort = sort ?? 'default';

    const hasDateRange = checkIn && checkOut;
    const checkInDate = hasDateRange ? dayjs(checkIn).startOf('day').toDate() : null;
    const checkOutDate = hasDateRange ? dayjs(checkOut).startOf('day').toDate() : null;
    const nightCount = hasDateRange
        ? dayjs(checkOut).diff(dayjs(checkIn), 'day')
        : 0;

    let exactMatches: RawHotelRow[] = [];
    let recommendations: RawHotelRow[] = [];

    if (hasDateRange && nightCount > 0) {
        try {
            exactMatches = await prisma.$queryRawUnsafe<RawHotelRow[]>(
                buildExactQuery(pSort),
                checkInDate,        // $1
                checkOutDate,       // $2
                rooms,              // $3
                guestCount,         // $4
                pCity,              // $5
                pKeyword,           // $6
                pHasWindow,         // $7
                pHasBreakfast,      // $8
                pChildrenFriendly,  // $9
                pMinPrice,          // $10
                pMaxPrice,          // $11
                limit,              // $12
                cursor,             // $13
                nightCount,         // $14
            );
        } catch (err) {
            console.error('Exact query failed, falling back:', err);
        }
    }

    if (exactMatches.length === 0) {
        try {
            recommendations = await prisma.$queryRawUnsafe<RawHotelRow[]>(
                buildFallbackQuery(pSort),
                pCity,              // $1
                pKeyword,           // $2
                guestCount,         // $3
                pMinPrice,          // $4
                pMaxPrice,          // $5
                pHasWindow,         // $6
                pHasBreakfast,      // $7
                pChildrenFriendly,  // $8
                limit,              // $9
                cursor,             // $10
            );
        } catch (err) {
            console.error('Fallback query failed:', err);
        }
    }

    if (exactMatches.length === 0 && recommendations.length === 0) {
        try {
            recommendations = await prisma.$queryRawUnsafe<RawHotelRow[]>(
                buildGlobalFallbackQuery(pSort),
                pKeyword,           // $1
                limit,              // $2
                cursor,             // $3
                pCity,              // $4
            );
        } catch (err) {
            console.error('Global fallback query failed:', err);
        }
    }

    const formatRow = (row: RawHotelRow, isFallback: boolean): HotelVo => ({
        id: Number(row.id),
        name: row.name,
        address: row.address,
        city: row.city,
        coverImage: row.cover_image,
        tags: row.tags ?? [],
        priceDesc: row.price_desc,
        score: Number(row.score),
        reviewCount: Number(row.review_count),
        minPrice: Number(row.min_price),
        isFallback,
    });

    const exactFormatted = exactMatches.map(r => formatRow(r, false));
    const recoFormatted = recommendations.map(r => formatRow(r, true));

    const allResults = [...exactFormatted, ...recoFormatted];
    const nextCursor = allResults.length === limit ? cursor + limit : null;

    const aiContext: AiContextItem[] = allResults.map(h => ({
        id: h.id,
        name: h.name,
        minPrice: h.minPrice,
        tags: h.tags,
    }));

    return {
        exactMatches: exactFormatted,
        recommendations: recoFormatted,
        nextCursor,
        total: allResults.length,
        aiContext,
    };
}
