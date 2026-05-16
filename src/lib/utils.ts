import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Customer } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helpers for billing
export const formatPeriod = (period: string) => {
  if (!period || period === '') return '';
  const [year, month] = period.split('-');
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
    'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

export const getUnpaidMonthsList = (customer: Customer | undefined, futureLimit = 0) => {
  if (!customer) return [];
  
  const paidPeriods = new Set<string>();
  if (customer.paid_months) {
    customer.paid_months.split(',').forEach(p => paidPeriods.add(p.trim()));
  }

  const joinMonth = customer.created_at?.slice(0, 7) || '2000-01';
  const now = new Date();
  const months = [];
  
  // Go back 24 months to catch arrears, and up to futureLimit
  for (let i = -24; i <= futureLimit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = d.toISOString().slice(0, 7);
      if (period < joinMonth) continue;
      if (!paidPeriods.has(period)) {
          months.push(period);
      }
  }
  return months.sort();
};

export const getBillingPeriods = () => {
    const periods = [];
    const now = new Date();
    // Show 12 months back and 12 months forward
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      periods.push(d.toISOString().slice(0, 7));
    }
    return periods.sort();
  };
