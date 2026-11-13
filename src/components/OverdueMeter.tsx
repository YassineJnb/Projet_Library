import React from 'react';
import { useLibrary } from '../context/LibraryContext';
import { calculateOverdueStatus } from '../utils/overdue';

interface OverdueMeterProps {
  dueDate: string;
  borrowDate?: string;
  compact?: boolean;
}

export const OverdueMeter: React.FC<OverdueMeterProps> = ({ dueDate, compact = false }) => {
  const { currentDate } = useLibrary();
  const status = calculateOverdueStatus(dueDate, currentDate);

  // Paint the widget directly with the color related to it:
  // - 1-2 days late: painted yellow, comment "Slightly Late"
  // - 1-2 weeks late: painted red, comment "Very Late"
  // - > 2 weeks late: painted black, comment "Overly Late"
  // - On time: painted green, comment "On Time"
  // (No text naming the colors!)
  const widgetStyles = {
    on_time: 'bg-emerald-600 text-white border-emerald-700',
    slightly_late: 'bg-amber-400 text-stone-950 border-amber-500 font-semibold',
    very_late: 'bg-rose-600 text-white border-rose-700 font-semibold',
    overly_late: 'bg-stone-950 text-white border-black font-semibold',
  }[status.severity];

  const daysLabel = status.diffDays > 0 ? `${status.diffDays}d late` : `${Math.abs(status.diffDays)}d left`;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border shadow-2xs ${widgetStyles}`}
      >
        <span>{status.comment}</span>
        <span className="opacity-80 font-mono text-[11px] tabular-nums">· {daysLabel}</span>
      </span>
    );
  }

  return (
    <div className={`px-3.5 py-2 rounded-lg border shadow-xs flex items-center justify-between ${widgetStyles}`}>
      <span className="text-xs tracking-tight">{status.comment}</span>
      <span className="font-mono text-xs tabular-nums opacity-90">{daysLabel}</span>
    </div>
  );
};
