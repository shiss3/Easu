import { Request, Response } from 'express';
import holidaysData from '../data/2026.json';

interface HolidayDay {
    name: string;
    date: string;
    isOffDay: boolean;
    displayLabel: string;
}

let cachedHolidays: HolidayDay[] | null = null;

const loadHolidays = async (): Promise<HolidayDay[]> => {
    if (cachedHolidays) {
        return cachedHolidays;
    }

    const parsed = holidaysData as { days?: HolidayDay[] };
    cachedHolidays = Array.isArray(parsed.days) ? parsed.days : [];
    return cachedHolidays;
};

export const getHolidayList = async (_req: Request, res: Response) => {
    try {
        const holidays = await loadHolidays();
        res.json({
            code: 200,
            message: '查询成功',
            data: holidays,
            meta: {
                total: holidays.length,
            },
        });
    } catch (error) {
        console.error('Calendar Holidays Error:', error);
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            data: null,
        });
    }
};
