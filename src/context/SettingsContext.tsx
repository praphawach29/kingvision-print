import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: string;
  details?: string;
  account_name?: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
}

interface StoreSettings {
  id?: string;
  store_name: string;
  contact_email: string;
  address: string;
  payment_methods: PaymentMethod[];
  shipping_methods: ShippingMethod[];
  line_oa_id?: string;
  line_oa_link?: string;
  notify_new_order: boolean;
}

interface SettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  store_name: 'KingVision Print',
  contact_email: 'contact@kingvision.com',
  address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
  payment_methods: [
    { id: '1', name: 'PromptPay', description: 'ชำระผ่าน QR Code', enabled: true, type: 'promptpay', details: '095-585-1136', account_name: 'บจก. คิงวิชั่น พรินเตอร์' },
    { id: '2', name: 'Bank Transfer', description: 'โอนเงินผ่านธนาคาร', enabled: true, type: 'bank', details: 'ธนาคารกสิกรไทย\nเลขที่บัญชี: 123-4-56789-0', account_name: 'บจก. คิงวิชั่น' }
  ],
  shipping_methods: [
    { id: '1', name: 'Kerry Express', price: 50, enabled: true },
    { id: '2', name: 'Flash Express', price: 40, enabled: true }
  ],
  line_oa_id: '@kingvision',
  line_oa_link: 'https://line.me/R/ti/p/@kingvision',
  notify_new_order: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
          payment_methods: data.payment_methods || defaultSettings.payment_methods,
          shipping_methods: data.shipping_methods || defaultSettings.shipping_methods,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
