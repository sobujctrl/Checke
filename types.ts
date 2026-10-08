export type RiskLevel = 'safe' | 'medium' | 'high' | 'new' | 'blacklisted' | 'whitelisted' | 'insufficient';

export interface CourierStat {
  courier: string;
  total: number;
  delivered: number;
  cancelled: number;
}

export interface NormalizedFraudResponse {
  couriers: CourierStat[];
  remaining_quota: number | null;
}

export interface CustomerHistoryRecord {
  phone: string;
  timestamp: string;
  rawTimestamp: number;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  successRate: number;
  riskLevel: RiskLevel;
  couriers: CourierStat[];
  cached?: boolean;
}

export interface BlacklistWhitelistItem {
  phone: string;
  type: 'blacklist' | 'whitelist';
  note: string;
  date: string;
}

export interface CacheEntry {
  data: NormalizedFraudResponse;
  timestamp: number;
}

export interface AppSettings {
  demoMode: boolean;
  webhookUrl: string;
  webhookToken: string;
  secretToken?: string;
  safeThreshold: number;
  mediumThreshold: number;
  minOrders: number;
  minOrderCount?: number;
  darkMode: boolean;
}
