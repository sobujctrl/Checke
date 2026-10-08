import { CourierStat, RiskLevel, AppSettings, BlacklistWhitelistItem } from '../types';

export interface RiskAnalysisResult {
  totalOrders: number;
  delivered: number;
  cancelled: number;
  successRate: number; // 0 to 100
  riskLevel: RiskLevel;
  recommendation: {
    bn: string;
    en: string;
    color: string;
    bgColor: string;
    badgeText: string;
  };
  isBlacklisted: boolean;
  isWhitelisted: boolean;
  blacklistNote?: string;
}

export function calculateRisk(
  couriers: CourierStat[],
  phone: string,
  settings: AppSettings,
  blacklistWhitelist: BlacklistWhitelistItem[] = []
): RiskAnalysisResult {
  const normalizedPhone = phone.trim();
  const bwItem = blacklistWhitelist.find((item) => item.phone === normalizedPhone);

  const isBlacklisted = bwItem?.type === 'blacklist';
  const isWhitelisted = bwItem?.type === 'whitelist';

  let totalOrders = 0;
  let delivered = 0;
  let cancelled = 0;

  for (const c of couriers) {
    totalOrders += c.total;
    delivered += c.delivered;
    cancelled += c.cancelled;
  }

  const successRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

  let riskLevel: RiskLevel = 'new';

  if (isBlacklisted) {
    riskLevel = 'blacklisted';
  } else if (isWhitelisted && totalOrders === 0) {
    riskLevel = 'whitelisted';
  } else if (totalOrders === 0) {
    riskLevel = 'new';
  } else if (totalOrders < settings.minOrderCount) {
    riskLevel = 'insufficient';
  } else {
    if (successRate >= settings.safeThreshold) {
      riskLevel = 'safe';
    } else if (successRate >= settings.mediumThreshold) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }
  }

  let recommendation = {
    bn: 'কোনো ইতিহাস নেই। ফোনে কনফার্ম করে পাঠানো ভালো।',
    en: 'No history found. Confirm order via phone call before dispatch.',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    badgeText: '🆕 নতুন কাস্টমার (New Customer)'
  };

  if (isBlacklisted) {
    recommendation = {
      bn: '🚫 এই কাস্টমার ব্ল্যাকলিস্টেড! অর্ডার ক্যানসেল করুন বা অগ্রিম পেমেন্ট নিন।',
      en: '🚫 This customer is blacklisted! Cancel order or require 100% advance payment.',
      color: 'text-rose-700 dark:text-rose-300',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      badgeText: '🚫 ব্ল্যাকলিস্টেড (Blacklisted)'
    };
  } else if (riskLevel === 'insufficient') {
    recommendation = {
      bn: '⚠️ পর্যাপ্ত ডেটা নেই (ন্যূনতম অর্ডারের চেয়ে কম)। সাবধানে অর্ডার নিন।',
      en: '⚠️ Insufficient delivery history. Proceed with standard verification.',
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      badgeText: '⚠️ পর্যাপ্ত ডেটা নেই (Low Volume)'
    };
  } else if (riskLevel === 'safe' || (isWhitelisted && riskLevel === 'whitelisted')) {
    recommendation = {
      bn: '✅ COD দেওয়া যাবে। কাস্টমারের ডেলিভারি রেকর্ড চমৎকার।',
      en: '✅ Safe for Cash on Delivery. Excellent delivery success record.',
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      badgeText: isWhitelisted ? '⭐ হোয়াইটলিস্টেড (Trusted)' : '✅ নিরাপদ (Safe COD)'
    };
  } else if (riskLevel === 'medium') {
    recommendation = {
      bn: '⚠️ ফোনে কনফার্ম করে তারপর পাঠান। মাঝারি ঝুঁকি রয়েছে।',
      en: '⚠️ Medium Risk. Confirm order via phone call before dispatch.',
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      badgeText: '⚠️ মাঝারি ঝুঁকি (Medium Risk)'
    };
  } else if (riskLevel === 'high') {
    recommendation = {
      bn: '🚨 COD বন্ধ করুন বা আগে অগ্রিম (advance) নিন। উচ্চ ঝুঁকি!',
      en: '🚨 High Risk! Do NOT send via Cash on Delivery without full advance payment.',
      color: 'text-rose-700 dark:text-rose-300',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      badgeText: '🚨 উচ্চ ঝুঁকি (High Risk)'
    };
  }

  return {
    totalOrders,
    delivered,
    cancelled,
    successRate,
    riskLevel,
    recommendation,
    isBlacklisted,
    isWhitelisted,
    blacklistNote: bwItem?.note
  };
}
