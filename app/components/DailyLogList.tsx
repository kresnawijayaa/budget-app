'use client';

import { DayEntry } from '@/lib/budget-utils';
import DayCard from './DayCard';

interface DailyLogListProps {
    entries: DayEntry[];
    todayDate: string;
    onUpdate: (id: number, data: { actual_amount?: number | null; is_wfo?: boolean }) => void;
}

interface WeekGroup {
    weekLabel: string;
    entries: DayEntry[];
}

function groupByWeek(entries: DayEntry[]): WeekGroup[] {
    const weeks: WeekGroup[] = [];
    let currentWeek: DayEntry[] = [];
    let weekNum = 1;

    for (const entry of entries) {
        currentWeek.push(entry);

        // Sunday (day_of_week = 0) is end of week (Mon-Sun)
        if (entry.day_of_week === 0) {
            weeks.push({ weekLabel: `Minggu ${weekNum}`, entries: currentWeek });
            currentWeek = [];
            weekNum++;
        }
    }

    // Remaining days
    if (currentWeek.length > 0) {
        weeks.push({ weekLabel: `Minggu ${weekNum}`, entries: currentWeek });
    }

    return weeks;
}

export default function DailyLogList({ entries, todayDate, onUpdate }: DailyLogListProps) {
    const weeks = groupByWeek(entries);

    return (
        <div>
            {weeks.map((week, i) => (
                <div className="week-group" key={i}>
                    <div className="week-label">{week.weekLabel}</div>
                    <div className="day-list">
                        {week.entries.map(entry => (
                            <DayCard
                                key={entry.id}
                                entry={entry}
                                isToday={entry.log_date === todayDate}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
