import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { cn } from '@/lib/utils.ts';
import { getHolidaysApi, type HolidayDay } from '@/services/calendar.ts';
import type { DateRange } from '@/store/searchStore';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const MONTH_CELL_CACHE = new Map<string, Array<Dayjs | null>>();
const DATE_FORMAT = 'YYYY-MM-DD';

interface CalendarProps {
    visible: boolean;
    selectedRange: DateRange;
    mode?: 'range' | 'single';
    onConfirm: (range: DateRange) => void;
    onClose: () => void;
}

const getMonthCells = (month: Dayjs): Array<Dayjs | null> => {
    const key = month.format('YYYY-MM');
    const cached = MONTH_CELL_CACHE.get(key);
    if (cached) {
        return cached;
    }
    const monthStart = month.startOf('month');
    const startWeekday = monthStart.day();
    const daysInMonth = month.daysInMonth();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const cells: Array<Dayjs | null> = [];

    for (let i = 0; i < totalCells; i += 1) {
        const dayIndex = i - startWeekday + 1;
        if (dayIndex <= 0 || dayIndex > daysInMonth) {
            cells.push(null);
        } else {
            cells.push(monthStart.date(dayIndex));
        }
    }

    MONTH_CELL_CACHE.set(key, cells);
    return cells;
};

const normalizeRange = (range: DateRange): DateRange => {
    const today = dayjs().startOf('day');
    const start = dayjs(range.start, DATE_FORMAT, true);
    const end = dayjs(range.end, DATE_FORMAT, true);
    if (!start.isValid() || !end.isValid()) {
        return {
            start: today.format(DATE_FORMAT) as DateRange['start'],
            end: today.add(1, 'day').format(DATE_FORMAT) as DateRange['end'],
        };
    }
    const safeStart = start.isBefore(today, 'day') ? today : start;
    const safeEnd = end.isAfter(safeStart, 'day') ? end : safeStart.add(1, 'day');
    return {
        start: safeStart.format(DATE_FORMAT) as DateRange['start'],
        end: safeEnd.format(DATE_FORMAT) as DateRange['end'],
    };
};

const Calendar = ({ visible, selectedRange, mode = 'range', onConfirm, onClose }: CalendarProps) => {
    // 仅用于弹层交互中的临时草稿，业务真值始终由 selectedRange + onConfirm 驱动。
    const [uiRange, setUiRange] = useState<{ start: Dayjs | null; end: Dayjs | null }>({
        start: null,
        end: null,
    });
    const [holidays, setHolidays] = useState<HolidayDay[]>([]);
    const today = useMemo(() => dayjs().startOf('day'), []);

    useEffect(() => {
        if (!visible) {
            return;
        }
        const normalized = normalizeRange(selectedRange);
        setUiRange({
            start: dayjs(normalized.start, DATE_FORMAT, true),
            end: mode === 'range' ? dayjs(normalized.end, DATE_FORMAT, true) : null,
        });
    }, [visible, selectedRange, mode]);

    useEffect(() => {
        if (!visible || !uiRange.start) {
            return;
        }
        const targetMonth = uiRange.start.format('YYYY-MM');
        const timer = window.setTimeout(() => {
            document.getElementById(`month-${targetMonth}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 100);
        return () => window.clearTimeout(timer);
    }, [visible, uiRange.start]);

    useEffect(() => {
        if (!visible || holidays.length > 0) {
            return;
        }
        const fetchHolidays = async () => {
            try {
                const res = await getHolidaysApi();
                setHolidays(res.data ?? []);
            } catch {
                setHolidays([]);
            }
        };
        void fetchHolidays();
    }, [visible, holidays.length]);

    const holidayMap = useMemo(() => new Map(holidays.map((item) => [item.date, item])), [holidays]);

    const months = useMemo(() => {
        const monthList: Dayjs[] = [];
        const startMonth = today.startOf('month');
        const endMonth = dayjs('2026-12-01');
        let cursor = startMonth;
        while (cursor.isBefore(endMonth) || cursor.isSame(endMonth, 'month')) {
            monthList.push(cursor);
            cursor = cursor.add(1, 'month');
        }
        return monthList;
    }, [today]);

    const nights = uiRange.start && uiRange.end ? Math.max(uiRange.end.diff(uiRange.start, 'day'), 1) : 0;
    const canConfirm = mode === 'single' ? Boolean(uiRange.start) : Boolean(uiRange.start && uiRange.end);

    const handleDateClick = (date: Dayjs) => {
        if (date.isBefore(today, 'day')) {
            return;
        }
        if (mode === 'single') {
            setUiRange({ start: date, end: date.add(1, 'day') });
            return;
        }
        if (!uiRange.start || (uiRange.start && uiRange.end)) {
            setUiRange({ start: date, end: null });
            return;
        }
        if (date.isBefore(uiRange.start, 'day')) {
            setUiRange((prev) => ({ ...prev, start: date }));
            return;
        }
        if (date.isAfter(uiRange.start, 'day')) {
            setUiRange((prev) => ({ ...prev, end: date }));
        }
    };

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className="absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white flex flex-col"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <button type="button" onClick={onClose} className="text-gray-500 text-xl">
                        ×
                    </button>
                    <div className="text-lg font-semibold">选择日期</div>
                    <div className="w-6" />
                </div>

                <div className="grid grid-cols-7 text-center text-xs text-gray-500 py-2 border-b border-gray-100">
                    {WEEK_DAYS.map((day) => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {months.map((month) => {
                        const cells = getMonthCells(month);
                        const monthKey = month.format('YYYY-MM');
                        return (
                            <div key={monthKey} id={`month-${monthKey}`} className="pt-4">
                                <div className="px-2 text-lg font-semibold mb-2">{month.format('YYYY年M月')}</div>
                                <div className="grid grid-cols-7 text-center">
                                    {cells.map((date, index) => {
                                        if (!date) {
                                            return <div key={`${monthKey}-${index}`} className="h-[60px]" />;
                                        }
                                        const dateStr = date.format(DATE_FORMAT);
                                        const holiday = holidayMap.get(dateStr);
                                        const isDisabled = date.isBefore(today, 'day');
                                        const isStart = uiRange.start?.isSame(date, 'day') ?? false;
                                        const isEnd = uiRange.end?.isSame(date, 'day') ?? false;
                                        const isInRange =
                                            mode === 'range' && uiRange.start && uiRange.end
                                                ? date.isAfter(uiRange.start, 'day') && date.isBefore(uiRange.end, 'day')
                                                : false;
                                        const tag = isStart ? '入住' : isEnd ? '离店' : '';
                                        const textColor = holiday?.isOffDay ? 'text-[#FF3333]' : 'text-gray-900';
                                        const isWorkdayLabel = holiday?.displayLabel === '班';

                                        return (
                                            <div
                                                key={`${dateStr}-${index}`}
                                                className={cn(
                                                    'h-[60px] flex items-center justify-center',
                                                    isInRange && 'bg-[#D6EAFE]',
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    disabled={isDisabled}
                                                    onClick={() => handleDateClick(date)}
                                                    className={cn(
                                                        'w-full h-full flex flex-col items-center justify-center gap-0 leading-none text-sm',
                                                        (isStart || isEnd) && 'bg-[#0066E0] text-white rounded-md',
                                                        isDisabled && 'text-gray-300 cursor-not-allowed',
                                                        !isDisabled && 'cursor-pointer',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'text-[9px] h-3 origin-center font-medium -my-[1px]',
                                                            (isStart || isEnd)
                                                                ? 'text-white'
                                                                : holiday?.isOffDay
                                                                  ? 'text-[#FF3333]'
                                                                  : 'text-gray-900',
                                                            isWorkdayLabel &&
                                                                !(isStart || isEnd) &&
                                                                'px-0.5 rounded-sm text-gray-600',
                                                        )}
                                                    >
                                                        {holiday?.displayLabel ?? ''}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-base font-medium -my-[1px]',
                                                            (isStart || isEnd)
                                                                ? 'text-white'
                                                                : isDisabled
                                                                  ? 'text-gray-300'
                                                                  : textColor,
                                                        )}
                                                    >
                                                        {date.date()}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-[9px] h-3 scale-90 origin-center font-medium -my-[1px]',
                                                            (isStart || isEnd) ? 'text-white' : 'invisible',
                                                        )}
                                                    >
                                                        {tag || '-'}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-gray-100 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={() => {
                            if (!uiRange.start) {
                                return;
                            }
                            if (mode === 'single') {
                                const nextEnd = uiRange.start.add(1, 'day');
                                onConfirm({
                                    start: uiRange.start.format(DATE_FORMAT) as DateRange['start'],
                                    end: nextEnd.format(DATE_FORMAT) as DateRange['end'],
                                });
                                onClose();
                                return;
                            }
                            if (uiRange.end) {
                                onConfirm({
                                    start: uiRange.start.format(DATE_FORMAT) as DateRange['start'],
                                    end: uiRange.end.format(DATE_FORMAT) as DateRange['end'],
                                });
                                onClose();
                            }
                        }}
                        className={cn(
                            'w-full h-12 rounded-lg text-lg font-medium',
                            canConfirm
                                ? 'bg-[#0086F6] text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                        )}
                    >
                        {canConfirm && mode === 'range' ? `完成（${nights}晚）` : '完成'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
