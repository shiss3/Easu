import { Request, Response } from 'express';
import { prisma } from '@repo/database';

interface CityRow {
    city: string;
    sim: number;
}

interface HotelRow {
    id: number;
    name: string;
    city: string;
    address: string;
    tags: string[];
    score: number;
    review_count: number;
    min_price: number;
    sim: number;
}

export const getSearchSuggestions = async (req: Request, res: Response) => {
    try {
        const { keyword } = req.query as { keyword?: string };

        if (!keyword || !keyword.trim()) {
            return res.json({ code: 200, data: [] });
        }

        const kw = keyword.trim();

        let cities: CityRow[] = [];
        let hotels: HotelRow[] = [];

        try {
            [cities, hotels] = await Promise.all([
                prisma.$queryRawUnsafe<CityRow[]>(`
                    SELECT DISTINCT city,
                           GREATEST(
                               word_similarity(city, $1::text),
                               CASE WHEN city ILIKE '%' || $1::text || '%' THEN 1.0 ELSE 0 END
                           ) AS sim
                    FROM "Hotel"
                    WHERE status = 1
                      AND (
                          city ILIKE '%' || $1::text || '%'
                          OR word_similarity(city, $1::text) > 0.3
                      )
                    ORDER BY sim DESC, city
                    LIMIT 3
                `, kw),

                prisma.$queryRawUnsafe<HotelRow[]>(`
                    WITH hotel_min_prices AS (
                        SELECT rt."hotelId" AS hotel_id, MIN(rt.price) AS min_price
                        FROM "RoomType" rt
                        GROUP BY rt."hotelId"
                    )
                    SELECT
                        h.id,
                        h.name,
                        h.city,
                        h.address,
                        h.tags,
                        h.score,
                        h."reviewCount" AS review_count,
                        COALESCE(hmp.min_price, 0) AS min_price,
                        GREATEST(
                            word_similarity(h.name, $1::text),
                            CASE WHEN h.name ILIKE '%' || $1::text || '%' THEN 1.0 ELSE 0 END
                        ) AS sim
                    FROM "Hotel" h
                    LEFT JOIN hotel_min_prices hmp ON hmp.hotel_id = h.id
                    WHERE h.status = 1
                      AND (
                          h.name ILIKE '%' || $1::text || '%'
                          OR h.city ILIKE '%' || $1::text || '%'
                          OR word_similarity(h.name, $1::text) > 0.3
                      )
                    ORDER BY sim DESC, h.score DESC, h."reviewCount" DESC
                    LIMIT 7
                `, kw),
            ]);
        } catch (err) {
            console.error('Search suggestions query error:', err);
        }

        const data: any[] = [];

        cities.forEach(c => {
            data.push({
                type: 'CITY',
                id: `city_${c.city}`,
                name: c.city,
                city: c.city,
            });
        });

        hotels.forEach(h => {
            data.push({
                type: 'HOTEL',
                id: Number(h.id),
                name: h.name,
                city: h.city,
                address: h.address,
                tags: h.tags ?? [],
                score: Number(h.score),
                reviewCount: Number(h.review_count),
                minPrice: Number(h.min_price),
            });
        });

        res.json({ code: 200, message: '查询成功', data });
    } catch (error) {
        console.error('Suggestion Error:', error);
        res.status(500).json({ code: 500, message: '内部错误', data: [] });
    }
};
