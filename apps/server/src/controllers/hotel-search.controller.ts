import { Request, Response } from 'express';
import { executeHotelSearch, SearchValidationError } from './hotel-search.service';

export const searchHotels = async (req: Request, res: Response) => {
    try {
        const result = await executeHotelSearch(req.body);

        res.json({
            code: 200,
            message: '查询成功',
            data: {
                exactMatches: result.exactMatches,
                recommendations: result.recommendations,
                nextCursor: result.nextCursor,
                total: result.total,
            },
        });
    } catch (error) {
        if (error instanceof SearchValidationError) {
            return res.status(400).json({
                code: 400,
                message: error.message,
                errors: error.errors.join(', '),
            });
        }

        console.error('Search Error:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            data: null,
        });
    }
};
