import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SingleCheckTab } from './components/SingleCheckTab';
import { BulkCheckTab } from './components/BulkCheckTab';
import { HistoryBlacklistTab } from './components/HistoryBlacklistTab';
import { SettingsTab } from './components/SettingsTab';
import { ReadmeTab } from './components/ReadmeTab';
import { Footer } from './components/Footer';
import { AppSettings, CustomerHistoryRecord, BlacklistWhitelistItem, CacheEntry, NormalizedFraudResponse } from './types';
import { DEFAULT_CONFIG } from './config';

const getInitialSettings = (): AppSettings => {
  const saved = localStorage.getItem('foc_settings') || localStorage.getItem('foc_settings_v2');
  let loaded: Partial<AppSettings> = {};
  if (saved) {
    try {
      loaded = JSON.parse(saved);
    } catch (e) {}
  }

  const webhookUrl = (loaded.webhookUrl !== undefined && loaded.webhookUrl !== '') 
    ? loaded.webhookUrl 
    : DEFAULT_CONFIG.webhookUrl;

  const webhookToken = (loaded.webhookToken !== undefined && loaded.webhookToken !== '') 
    ? loaded.webhookToken 
    : (loaded.secretToken !== undefined && loaded.secretToken !== '') 
    ? loaded.secretToken 
    : DEFAULT_CONFIG.webhookToken;

  const minOrders = loaded.minOrders ?? loaded.minOrderCount ?? DEFAULT_CONFIG.minOrders;

  return {
    demoMode: loaded.demoMode ?? DEFAULT_CONFIG.demoMode,
    webhookUrl,
    webhookToken,
    secretToken: webhookToken,
    safeThreshold: loaded.safeThreshold ?? DEFAULT_CONFIG.safeThreshold,
    mediumThreshold: loaded.mediumThreshold ?? DEFAULT_CONFIG.mediumThreshold,
    minOrders,
    minOrderCount: minOrders,
    darkMode: loaded.darkMode ?? false,
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'history' | 'settings' | 'readme'>('single');
  
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);

  const [history, setHistory] = useState<CustomerHistoryRecord[]>(() => {
    const saved = localStorage.getItem('foc_history_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [blacklistWhitelist, setBlacklistWhitelist] = useState<BlacklistWhitelistItem[]>(() => {
    const saved = localStorage.getItem('foc_blacklist_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [
          { phone: '01711000000', type: 'blacklist', note: 'বারবার ফেক অর্ডার করেছে এবং রিসিভ করেনি', date: '2026-03-01' },
          { phone: '01811111111', type: 'whitelist', note: 'বিশ্বস্ত নিয়মিত ক্রেতা', date: '2026-03-02' }
        ];
      }
    }
    return [
      { phone: '01711000000', type: 'blacklist', note: 'বারবার ফেক অর্ডার করেছে এবং রিসিভ করেনি', date: '2026-03-01' },
      { phone: '01811111111', type: 'whitelist', note: 'বিশ্বস্ত নিয়মিত ক্রেতা', date: '2026-03-02' }
    ];
  });

  const [cache, setCache] = useState<Record<string, CacheEntry>>(() => {
    const saved = localStorage.getItem('foc_cache_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const [dailyUsage, setDailyUsage] = useState<{ date: string; count: number }>(() => {
    const todayStr = new Date().toDateString();
    const saved = localStorage.getItem('foc_daily_usage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayStr) {
          return parsed;
        }
      } catch (e) {}
    }
    return { date: todayStr, count: 0 };
  });

  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(settings.darkMode);

  useEffect(() => {
    localStorage.setItem('foc_settings', JSON.stringify(settings));
    localStorage.setItem('foc_settings_v2', JSON.stringify(settings));
    setDarkMode(settings.darkMode);
  }, [settings]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setSettings((prev) => ({ ...prev, darkMode }));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('foc_history_v2', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('foc_blacklist_v2', JSON.stringify(blacklistWhitelist));
  }, [blacklistWhitelist]);

  useEffect(() => {
    localStorage.setItem('foc_cache_v2', JSON.stringify(cache));
  }, [cache]);

  useEffect(() => {
    localStorage.setItem('foc_daily_usage', JSON.stringify(dailyUsage));
  }, [dailyUsage]);

  const handleUpdateCache = (phone: string, data: NormalizedFraudResponse) => {
    setCache((prev) => ({
      ...prev,
      [phone]: { data, timestamp: Date.now() },
    }));
  };

  const handleAddHistory = (record: CustomerHistoryRecord) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.phone !== record.phone);
      return [record, ...filtered].slice(0, 100);
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleAddBlacklistWhitelist = (item: BlacklistWhitelistItem) => {
    setBlacklistWhitelist((prev) => {
      const filtered = prev.filter((i) => i.phone !== item.phone);
      return [item, ...filtered];
    });
  };

  const handleRemoveBlacklistWhitelist = (phone: string) => {
    setBlacklistWhitelist((prev) => prev.filter((i) => i.phone !== phone));
  };

  const handleIncrementUsage = () => {
    const todayStr = new Date().toDateString();
    setDailyUsage((prev) => {
      if (prev.date === todayStr) {
        return { date: todayStr, count: prev.count + 1 };
      }
      return { date: todayStr, count: 1 };
    });
  };

  const handleClearAllData = () => {
    localStorage.removeItem('foc_settings');
    localStorage.removeItem('foc_settings_v2');
    localStorage.removeItem('foc_history_v2');
    localStorage.removeItem('foc_blacklist_v2');
    localStorage.removeItem('foc_cache_v2');
    localStorage.removeItem('foc_daily_usage');
    setSettings(getInitialSettings());
    setHistory([]);
    setBlacklistWhitelist([]);
    setCache({});
    setDailyUsage({ date: new Date().toDateString(), count: 0 });
    setRemainingQuota(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        dailyUsageCount={dailyUsage.count}
        remainingQuota={remainingQuota}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'single' && (
          <SingleCheckTab
            settings={settings}
            blacklistWhitelist={blacklistWhitelist}
            cache={cache}
            onUpdateCache={handleUpdateCache}
            onAddHistory={handleAddHistory}
            onAddBlacklistWhitelist={handleAddBlacklistWhitelist}
            onIncrementUsage={handleIncrementUsage}
            onUpdateQuota={setRemainingQuota}
          />
        )}
        {activeTab === 'bulk' && (
          <BulkCheckTab
            settings={settings}
            blacklistWhitelist={blacklistWhitelist}
            cache={cache}
            onUpdateCache={handleUpdateCache}
            onAddHistory={handleAddHistory}
            onIncrementUsage={handleIncrementUsage}
            onUpdateQuota={setRemainingQuota}
          />
        )}
        {activeTab === 'history' && (
          <HistoryBlacklistTab
            history={history}
            blacklistWhitelist={blacklistWhitelist}
            onClearHistory={handleClearHistory}
            onRemoveBlacklistWhitelist={handleRemoveBlacklistWhitelist}
            onAddBlacklistWhitelist={handleAddBlacklistWhitelist}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={setSettings}
            onClearAllData={handleClearAllData}
          />
        )}
        {activeTab === 'readme' && <ReadmeTab />}
      </main>

      <Footer />
    </div>
  );
}
