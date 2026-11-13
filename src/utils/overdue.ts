import { OverdueCalculation, OverdueSeverity } from '../types/library';

/**
 * Calculates overdue severity, exact comments, meter colors, and percentage based on
 * the prompt's specified rules:
 * - 1-2 days late: Yellow color with a "Slightly Late" comment
 * - 1-2 weeks late (3-14 days): Red color with a "Very Late" comment
 * - More than that (>14 days): Black color with an "Overly Late" comment
 * - Not late: Green color with "On Time" comment
 */
export function calculateOverdueStatus(dueDateStr: string, currentDateStr?: string): OverdueCalculation {
  const dueDate = new Date(dueDateStr);
  // Default to today or simulated date
  const now = currentDateStr ? new Date(currentDateStr) : new Date();

  // Normalize to midnight UTC/local to compare whole calendar days
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffMs = nowMidnight - dueMidnight;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const daysRemaining = Math.abs(diffDays);
    return {
      diffDays,
      severity: 'on_time',
      comment: daysRemaining === 0 ? 'Due Today' : `On Time (${daysRemaining}d left)`,
      meterColor: 'bg-emerald-500',
      badgeClasses: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      percentage: Math.min(100, Math.max(10, 100 - daysRemaining * 10)),
      isLate: false,
    };
  }

  // 1-2 days late: Yellow color with a slightly late comment
  if (diffDays >= 1 && diffDays <= 2) {
    return {
      diffDays,
      severity: 'slightly_late',
      comment: 'Slightly Late',
      meterColor: 'bg-amber-400',
      badgeClasses: 'text-amber-900 bg-amber-100 border-amber-300 font-semibold',
      percentage: 35 + diffDays * 5, // ~40-45% on the meter
      isLate: true,
    };
  }

  // 1-2 weeks late (3 to 14 days): Red color with a very late comment
  if (diffDays >= 3 && diffDays <= 14) {
    return {
      diffDays,
      severity: 'very_late',
      comment: 'Very Late',
      meterColor: 'bg-rose-600',
      badgeClasses: 'text-rose-900 bg-rose-100 border-rose-300 font-semibold',
      percentage: 50 + Math.min(35, (diffDays / 14) * 35), // ~55-85% on the meter
      isLate: true,
    };
  }

  // More than that (> 14 days): Black color with an overly late comment
  return {
    diffDays,
    severity: 'overly_late',
    comment: 'Overly Late',
    meterColor: 'bg-stone-900',
    badgeClasses: 'text-white bg-stone-900 border-stone-800 font-semibold',
    percentage: 100,
    isLate: true,
  };
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
