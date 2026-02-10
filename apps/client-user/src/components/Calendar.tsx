import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { cn } from '@/lib/utils.ts';
import { getHolidaysApi, type HolidayDay } from '@/services/calendar.ts';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalendarProps {
    visible: boolean;
    defaultDate: {
        start: Date;
        end: Date;
    };
    mode?: 'range' | 'single';
    onConfirm: (start: Date, end: Date | null) => void;
    onClose: () => void;
}

interface MonthCell {
    date: Dayjs | null;
}

const buildMonthCells = (month: Dayjs): MonthCell[] => {
    const monthStart = month.startOf('month');
    const startWeekday = monthStart.day();
    const daysInMonth = month.daysInMonth();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const cells: MonthCell[] = [];

    for (let i = 0; i < totalCells; i += 1) {
        const dayIndex = i - startWeekday + 1;
        if (dayIndex <= 0 || dayIndex > daysInMonth) {
            cells.push({ date: null });
        } else {
            cells.push({ date: monthStart.date(dayIndex) });
        }
    }

    return cells;
};

const Calendar = ({ visible, defaultDate, mode = 'range', onConfirm, onClose }: CalendarProps) => {
    const [selectStart, setSelectStart] = useState<Dayjs | null>(null);
    const [selectEnd, setSelectEnd] = useState<Dayjs | null>(null);
    const [holidays, setHolidays] = useState<HolidayDay[]>([]);
    const [loading, setLoading] = useState(false);

    // 保持稳定引用：否则依赖 today 的 useMemo 每次渲染都会重算
    const today = useMemo(() => dayjs().startOf('day'), []);

    useEffect(() => {
        if (!visible) {
            return;
        }
        setSelectStart(dayjs(defaultDate.start).startOf('day'));
        setSelectEnd(mode === 'range' ? dayjs(defaultDate.end).startOf('day') : null);
    }, [visible, defaultDate.start, defaultDate.end, mode]);

    useEffect(() => {
        if (!visible || !selectStart) {
            return;
        }

        const targetMonth = selectStart.format('YYYY-MM');
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`month-${targetMonth}`);
            if (element) {
                element.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }, 100);

        return () => window.clearTimeout(timer);
    }, [visible, selectStart]);

    useEffect(() => {
        if (!visible || holidays.length > 0) {
            return;
        }

        const fetchHolidays = async () => {
            setLoading(true);
            try {
                const res = await getHolidaysApi();
                setHolidays(res.data ?? []);
            } catch (error) {
                console.error('获取节假日失败:', error);
                setHolidays([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHolidays();
    }, [visible, holidays.length]);

    const holidayMap = useMemo(() => {
        return new Map(holidays.map((item) => [item.date, item]));
    }, [holidays]);

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

    const nights = selectStart && selectEnd ? selectEnd.diff(selectStart, 'day') : 0;
    const canConfirm = mode === 'single' ? Boolean(selectStart) : Boolean(selectStart && selectEnd);

    const handleDateClick = (date: Dayjs) => {
        if (date.isBefore(today, 'day')) {
            return;
        }

        if (mode === 'single') {
            setSelectStart(date);
            setSelectEnd(null);
            return;
        }

        if (!selectStart || (selectStart && selectEnd)) {
            setSelectStart(date);
            setSelectEnd(null);
            return;
        }

        if (selectStart && !selectEnd) {
            if (date.isBefore(selectStart, 'day')) {
                setSelectStart(date);
            } else if (date.isAfter(selectStart, 'day')) {
                setSelectEnd(date);
            }
        }
    };

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100]">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div
                className="absolute inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white flex flex-col"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 text-xl"
                    >
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
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            加载中...
                        </div>
                    ) : (
                        months.map((month) => {
                            const cells = buildMonthCells(month);
                            return (
                                <div
                                    key={month.format('YYYY-MM')}
                                    id={`month-${month.format('YYYY-MM')}`}
                                    className="pt-4"
                                >
                                    <div className="px-2 text-lg font-semibold mb-2">
                                        {month.format('YYYY年M月')}
                                    </div>
                                    <div className="grid grid-cols-7 text-center">
                                        {cells.map((cell, index) => {
                                            if (!cell.date) {
                                                return <div key={`${month.format('YYYY-MM')}-${index}`} className="h-[60px]" />;
                                            }

                                            const date = cell.date;
                                            const dateStr = date.format('YYYY-MM-DD');
                                            const holiday = holidayMap.get(dateStr);
                                            const isDisabled = date.isBefore(today, 'day');
                                            const isStart = selectStart?.isSame(date, 'day');
                                            const isEnd = selectEnd?.isSame(date, 'day');
                                            const isInRange = mode === 'range' && selectStart && selectEnd
                                                ? date.isAfter(selectStart, 'day') && date.isBefore(selectEnd, 'day')
                                                : false;
                                            const tag = isStart ? '入住' : isEnd ? '离店' : '';

                                            const textColor = holiday?.isOffDay ? 'text-[#FF3333]' : 'text-gray-900';
                                            const isWorkdayLabel = holiday?.displayLabel === '班';

                                            return (
                                                <div
                                                    key={`${dateStr}-${index}`}
                                                    className={cn(
                                                        'h-[60px] flex items-center justify-center',
                                                        isInRange && 'bg-[#D6EAFE]'
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
                                                            !isDisabled && 'cursor-pointer'
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
                                                                isWorkdayLabel && !(isStart || isEnd) && 'px-0.5 rounded-sm text-gray-600'
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
                                                                        : textColor
                                                            )}
                                                        >
                                                            {date.date()}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'text-[9px] h-3 scale-90 origin-center font-medium -my-[1px]',
                                                                (isStart || isEnd) ? 'text-white' : 'invisible'
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
                        })
                    )}
                </div>

                <div className="border-t border-gray-100 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={() => {
                            if (mode === 'single' && selectStart) {
                                onConfirm(selectStart.toDate(), null);
                                onClose();
                                return;
                            }
                            if (selectStart && selectEnd) {
                                onConfirm(selectStart.toDate(), selectEnd.toDate());
                                onClose();
                            }
                        }}
                        className={cn(
                            'w-full h-12 rounded-lg text-lg font-medium',
                            canConfirm
                                ? 'bg-[#0086F6] text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
