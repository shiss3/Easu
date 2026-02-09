import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

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

    const dataPath = path.resolve(__dirname, '../data/2026.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(fileContent) as { days?: HolidayDay[] };

    cachedHolidays = Array.isArray(parsed?.days) ? parsed.days : [];
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
