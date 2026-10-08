import { CourierResult, AppSettings } from '../types';

const DEMO_ALLOWED_NUMBERS = [
  '01711000000',
  '01811111111',
  '01922222222',
  '01355555555',
];

/**
 * Generate consistent pseudo-random demo stats for allowed demo numbers only
 */
function getDemoCourierStats(phone: string, courierName: string): { total: number; delivered: number; cancelled: number } {
  if (!DEMO_ALLOWED_NUMBERS.includes(phone)) {
    return { total: 0, delivered: 0, cancelled: 0 };
  }

  let hash = 0;
  const str = phone + courierName;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  if (phone === '01711000000' || phone.endsWith('000')) {
    const total = 10;
    const delivered = 3; // 30% success (High risk)
    return { total, delivered, cancelled: total - delivered };
  } else if (phone === '01811111111' || phone.endsWith('111')) {
    const total = 12;
    const delivered = 11; // ~92% success (Safe)
    return { total, delivered, cancelled: total - delivered };
  } else if (phone === '01922222222' || phone.endsWith('222')) {
    const total = 10;
    const delivered = 7; // 70% success (Medium)
    return { total, delivered, cancelled: total - delivered };
  }

  // Default for other allowed demo numbers
  const total = 5 + (positiveHash % 8);
  const delivered = Math.floor(total * 0.8);
  return { total, delivered, cancelled: total - delivered };
}

export async function fetchCourierHistoryForPhone(
  phone: string,
  settings: AppSettings
): Promise<CourierResult[]> {
  const couriersList = [
    { key: 'pathao', name: 'Pathao Courier' },
    { key: 'steadfast', name: 'Steadfast Courier' },
    { key: 'redx', name: 'RedX Parcel' }
  ];

  // Check if Demo Mode is OFF and no Webhook and no Courier APIs configured
  const hasWebhook = Boolean(settings.webhookUrl && settings.webhookUrl.trim() !== '');
  const hasAnyCourierApi = Object.values(settings.couriers).some(
    (c) => c.enabled && c.apiUrl && c.apiUrl.trim() !== '' && c.apiKey && c.apiKey.trim() !== ''
  );

  if (!settings.demoMode && !hasWebhook && !hasAnyCourierApi) {
    throw new Error('কোনো কুরিয়ার API বা Webhook সেট করা নেই। Settings-এ গিয়ে সেট করুন।');
  }

  const results: CourierResult[] = [];

  // 1. Check if Webhook URL is configured and Demo Mode is OFF (or even if Demo mode is off)
  if (hasWebhook && !settings.demoMode) {
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.couriers)) {
        return data.couriers;
      }
    } catch (err: any) {
      console.warn('Webhook fetch failed:', err);
      throw new Error(err.message || 'Webhook connection failed');
    }
  }

  // 2. If Demo Mode is ON
  if (settings.demoMode) {
    for (const c of couriersList) {
      const stats = getDemoCourierStats(phone, c.name);
      results.push({
        courier: c.name,
        total: stats.total,
        delivered: stats.delivered,
        cancelled: stats.cancelled,
      });
    }
    return results;
  }

  // 3. Fetch from individual configured couriers
  for (const c of couriersList) {
    const config = settings.couriers[c.key as keyof typeof settings.couriers];
    
    if (!config.enabled || !config.apiUrl || !config.apiKey) continue;

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'Api-Key': config.apiKey,
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      results.push({
        courier: c.name,
        total: Number(data.total ?? data.total_orders ?? 0),
        delivered: Number(data.delivered ?? data.successful_orders ?? 0),
        cancelled: Number(data.cancelled ?? data.returned_orders ?? 0),
      });
    } catch (err: any) {
      results.push({
        courier: c.name,
        total: 0,
        delivered: 0,
        cancelled: 0,
        error: err.message || 'Connection failed',
      });
    }
  }

  if (results.length === 0) {
    throw new Error('কোনো কুরিয়ার API বা Webhook সেট করা নেই। Settings-এ গিয়ে সেট করুন।');
  }

  return results;
}
