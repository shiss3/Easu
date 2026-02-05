import { httpClient } from '@/lib/http';

export interface HolidayDay {
    name: string;
    date: string; // "YYYY-MM-DD"
    isOffDay: boolean; // true=休 (红色), false=班/节日 (黑色)
    displayLabel: string; // 显示在日期上方的文字
}

export const getHolidaysApi = () => {
    return httpClient.get<HolidayDay[]>('/calendar/holidays');
};
