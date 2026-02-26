import type { Request, Response } from 'express';
import citiesData from '../data/cities.json';

// GET /api/cities
export const getCities = (_req: Request, res: Response) => {
    res.json({
        code: 200,
        message: '查询成功',
        data: {
            hotCities: citiesData.hotCities,
            alphabet: citiesData.alphabet,
            allCities: citiesData.allCities,
        },
    });
};
