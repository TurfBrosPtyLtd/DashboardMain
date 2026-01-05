import { getDaysInMonth } from "date-fns";

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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getWeeksInMonth(year: number, month: number): number {
  const days = getDaysInMonth(new Date(year, month));
  return days / 7;
}

export function calculateMonthlyDistribution(params: ServiceDistributionParams): MonthlyDistribution[] {
  const { year, annualServices } = params;
  
  const monthlyWeeks: number[] = [];
  let totalWeeks = 0;
  
  for (let m = 0; m < 12; m++) {
    const weeks = getWeeksInMonth(year, m);
    monthlyWeeks.push(weeks);
    totalWeeks += weeks;
  }
  
  const idealServicesPerWeek = annualServices / totalWeeks;
  const rawDistribution = monthlyWeeks.map(weeks => weeks * idealServicesPerWeek);
  
  const flooredDistribution = rawDistribution.map(v => Math.floor(v));
  let currentTotal = flooredDistribution.reduce((a, b) => a + b, 0);
  const remainder = annualServices - currentTotal;
  
  const remainders = rawDistribution.map((v, i) => ({
    index: i,
    remainder: v - Math.floor(v)
  }));
  
  remainders.sort((a, b) => b.remainder - a.remainder);
  
  for (let i = 0; i < remainder; i++) {
    flooredDistribution[remainders[i].index]++;
  }
  
  return monthlyWeeks.map((weeks, i) => ({
    month: i,
    name: MONTH_NAMES[i],
    weeks: Math.round(weeks * 100) / 100,
    services: flooredDistribution[i]
  }));
}

export function getServicesArray(params: ServiceDistributionParams): number[] {
  return calculateMonthlyDistribution(params).map(m => m.services);
}
