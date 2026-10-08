import { NormalizedFraudResponse, CourierStat, AppSettings } from '../types';
import { DEFAULT_CONFIG } from '../config';

const STANDARD_COURIERS = ['Steadfast', 'Pathao', 'Redx', 'Carrybee', 'Paperfly'];

const DEMO_ALLOWED_NUMBERS = [
  '01711000000',
  '01811111111',
  '01922222222',
  '01355555555',
];

export function normalizeResponse(raw: any): NormalizedFraudResponse {
  if (!raw) {
    throw new Error('empty_response');
  }

  const rawCouriers = Array.isArray(raw.couriers)
    ? raw.couriers
    : Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];

  const couriersMap: Record<string, CourierStat> = {};

  for (const name of STANDARD_COURIERS) {
    couriersMap[name.toLowerCase()] = {
      courier: name,
      total: 0,
      delivered: 0,
      cancelled: 0,
    };
  }

  for (const c of rawCouriers) {
    const name = (c.courier || c.name || c.service || '').trim();
    if (!name) continue;

    const lowerKey = name.toLowerCase();
    const matchedKey = STANDARD_COURIERS.find((sc) => sc.toLowerCase() === lowerKey) || name;

    const total = Number(c.total ?? c.total_orders ?? c.parcel_count ?? 0) || 0;
    const delivered = Number(c.delivered ?? c.successful_orders ?? c.success ?? 0) || 0;
    const cancelled = Number(c.cancelled ?? c.returned_orders ?? c.return ?? c.failed ?? 0) || 0;

    couriersMap[matchedKey.toLowerCase()] = {
      courier: matchedKey,
      total,
      delivered,
      cancelled,
    };
  }

  const couriers = STANDARD_COURIERS.map((sc) => couriersMap[sc.toLowerCase()]);
  const remaining_quota = raw.remaining_quota !== undefined && raw.remaining_quota !== null ? Number(raw.remaining_quota) : null;

  return {
    couriers,
    remaining_quota,
  };
}

function getDemoResponse(phone: string): NormalizedFraudResponse {
  if (!DEMO_ALLOWED_NUMBERS.includes(phone)) {
    return {
      couriers: STANDARD_COURIERS.map((c) => ({ courier: c, total: 0, delivered: 0, cancelled: 0 })),
      remaining_quota: 450,
    };
  }

  if (phone === '01711000000') {
    return {
      couriers: [
        { courier: 'Steadfast', total: 6, delivered: 1, cancelled: 5 },
        { courier: 'Pathao', total: 4, delivered: 1, cancelled: 3 },
        { courier: 'Redx', total: 2, delivered: 0, cancelled: 2 },
        { courier: 'Carrybee', total: 0, delivered: 0, cancelled: 0 },
        { courier: 'Paperfly', total: 0, delivered: 0, cancelled: 0 },
      ],
      remaining_quota: 480,
    };
  } else if (phone === '01811111111') {
    return {
      couriers: [
        { courier: 'Steadfast', total: 8, delivered: 8, cancelled: 0 },
        { courier: 'Pathao', total: 5, delivered: 5, cancelled: 0 },
        { courier: 'Redx', total: 2, delivered: 1, cancelled: 1 },
        { courier: 'Carrybee', total: 0, delivered: 0, cancelled: 0 },
        { courier: 'Paperfly', total: 0, delivered: 0, cancelled: 0 },
      ],
      remaining_quota: 479,
    };
  } else if (phone === '01922222222') {
    return {
      couriers: [
        { courier: 'Steadfast', total: 5, delivered: 3, cancelled: 2 },
        { courier: 'Pathao', total: 5, delivered: 4, cancelled: 1 },
        { courier: 'Redx', total: 0, delivered: 0, cancelled: 0 },
        { courier: 'Carrybee', total: 0, delivered: 0, cancelled: 0 },
        { courier: 'Paperfly', total: 0, delivered: 0, cancelled: 0 },
      ],
      remaining_quota: 478,
    };
  } else {
    return {
      couriers: STANDARD_COURIERS.map((c) => ({ courier: c, total: 0, delivered: 0, cancelled: 0 })),
      remaining_quota: 477,
    };
  }
}

export async function fetchFraudData(
  phone: string,
  settings: AppSettings
): Promise<NormalizedFraudResponse> {
  if (settings.demoMode) {
    return getDemoResponse(phone);
  }

  const url = (settings.webhookUrl && settings.webhookUrl.trim() !== '') 
    ? settings.webhookUrl.trim() 
    : DEFAULT_CONFIG.webhookUrl;

  const token = (settings.webhookToken !== undefined && settings.webhookToken !== '')
    ? settings.webhookToken.trim()
    : (settings.secretToken !== undefined && settings.secretToken !== '')
    ? settings.secretToken.trim()
    : DEFAULT_CONFIG.webhookToken;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error('এপিআই লিমিট (Rate Limit) অতিক্রম করেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }

    if (!response.ok) {
      throw new Error(`সার্ভার ত্রুটি: HTTP status ${response.status}`);
    }

    const rawJson = await response.json();
    return normalizeResponse(rawJson);
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('নেটওয়ার্ক সংযোগে সমস্যা বা টাইমআউট হয়েছে (১৫ সেকেন্ড)। আবার চেষ্টা করুন।');
    }

    if (err.message && err.message.includes('Rate Limit')) {
      throw err;
    }

    if (err instanceof TypeError || (err.message && err.message.includes('Failed to fetch'))) {
      throw new Error('নেটওয়ার্ক সংযোগে সমস্যা বা টাইমআউট হয়েছে (১৫ সেকেন্ড)। আবার চেষ্টা করুন।');
    }

    throw new Error(err.message || 'এপিআই থেকে সঠিক ফরম্যাটে ডেটা পাওয়া যায়নি।');
  }
}
