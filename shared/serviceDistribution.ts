import { addWeeks, startOfYear, getMonth, eachWeekOfInterval, endOfYear } from "date-fns";

export interface ServiceDistributionParams {
  year: number;
  annualServices: number;
  cadence: "two_week" | "four_week";
}

export interface MonthlyDistribution {
  month: number;
  name: string;
  weeks: number;
  services: number;
}

export interface ServiceWeek {
  weekNumber: number;
  date: Date;
  month: number;
  isSkipped: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SLOWDOWN_MONTHS_24 = [5, 6, 7]; // June, July, August
const SLOWDOWN_MONTHS_22 = [4, 5, 6, 7]; // May, June, July, August

export function generateServiceWeeks(year: number): ServiceWeek[] {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  
  const allWeeks = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 }
  );
  
  const fortnightlyWeeks: ServiceWeek[] = [];
  for (let i = 0; i < allWeeks.length && fortnightlyWeeks.length < 26; i += 2) {
    const weekDate = allWeeks[i];
    if (weekDate.getFullYear() === year) {
      fortnightlyWeeks.push({
        weekNumber: i + 1,
        date: weekDate,
        month: getMonth(weekDate),
        isSkipped: false
      });
    }
  }
  
  while (fortnightlyWeeks.length < 26) {
    const lastDate = fortnightlyWeeks[fortnightlyWeeks.length - 1]?.date || yearStart;
    const nextDate = addWeeks(lastDate, 2);
    fortnightlyWeeks.push({
      weekNumber: fortnightlyWeeks.length + 1,
      date: nextDate,
      month: getMonth(nextDate) % 12,
      isSkipped: false
    });
  }
  
  return fortnightlyWeeks.slice(0, 26);
}

export function applySkipLogic(weeks: ServiceWeek[], annualServices: number): ServiceWeek[] {
  const result = weeks.map(w => ({ ...w }));
  
  if (annualServices >= 26) {
    return result;
  }
  
  const skipsNeeded = 26 - annualServices;
  let skipped = 0;
  
  let slowdownMonths: number[];
  if (annualServices <= 22) {
    slowdownMonths = SLOWDOWN_MONTHS_22;
  } else {
    slowdownMonths = SLOWDOWN_MONTHS_24;
  }
  
  const getMonthCounts = () => {
    const counts: Map<number, number[]> = new Map();
    for (let m = 0; m < 12; m++) counts.set(m, []);
    result.forEach((w, idx) => {
      if (!w.isSkipped) {
        const arr = counts.get(w.month);
        if (arr) arr.push(idx);
      }
    });
    return counts;
  };
  
  let round = 0;
  while (skipped < skipsNeeded && round < 20) {
    const counts = getMonthCounts();
    let skippedThisRound = false;
    
    for (const month of slowdownMonths) {
      if (skipped >= skipsNeeded) break;
      const indices = counts.get(month) || [];
      if (indices.length > 1) {
        result[indices[0]].isSkipped = true;
        skipped++;
        skippedThisRound = true;
        break;
      }
    }
    
    if (!skippedThisRound && skipped < skipsNeeded) {
      const shoulderMonths = [3, 8, 9, 10];
      for (const month of shoulderMonths) {
        if (skipped >= skipsNeeded) break;
        const indices = counts.get(month) || [];
        if (indices.length > 1) {
          result[indices[0]].isSkipped = true;
          skipped++;
          skippedThisRound = true;
          break;
        }
      }
    }
    
    if (!skippedThisRound && skipped < skipsNeeded) {
      for (let m = 0; m < 12; m++) {
        if (skipped >= skipsNeeded) break;
        const indices = counts.get(m) || [];
        if (indices.length > 1) {
          result[indices[0]].isSkipped = true;
          skipped++;
          skippedThisRound = true;
          break;
        }
      }
    }
    
    if (!skippedThisRound) break;
    round++;
  }
  
  return result;
}

export function aggregateByMonth(weeks: ServiceWeek[]): number[] {
  const monthly = new Array(12).fill(0);
  
  for (const week of weeks) {
    if (!week.isSkipped && week.month >= 0 && week.month < 12) {
      monthly[week.month]++;
    }
  }
  
  return monthly;
}

export function calculateMonthlyDistribution(params: ServiceDistributionParams): MonthlyDistribution[] {
  const { year, annualServices } = params;
  
  const baseWeeks = generateServiceWeeks(year);
  const adjustedWeeks = applySkipLogic(baseWeeks, annualServices);
  const monthlyServices = aggregateByMonth(adjustedWeeks);
  
  return MONTH_NAMES.map((name, i) => ({
    month: i,
    name,
    weeks: 0,
    services: monthlyServices[i]
  }));
}

export function getServicesArray(params: ServiceDistributionParams): number[] {
  return calculateMonthlyDistribution(params).map(m => m.services);
}

export function getTotalServices(params: ServiceDistributionParams): number {
  const baseWeeks = generateServiceWeeks(params.year);
  const adjustedWeeks = applySkipLogic(baseWeeks, params.annualServices);
  return adjustedWeeks.filter(w => !w.isSkipped).length;
}
