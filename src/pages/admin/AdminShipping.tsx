import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, CheckCircle, Loader2,
  Truck, MapPin, Calculator, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Carrier {
  id: string;
  name: string;
  phone: string;
  base_weight: number;
  base_price: number;
  extra_per_kg: number;
  is_active: boolean;
  notes: string;
  created_at: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  surcharge: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

type CarrierDraft = Omit<Carrier, 'id' | 'created_at'>;
type ZoneDraft = Omit<DeliveryZone, 'id' | 'created_at'>;

const EMPTY_CARRIER: CarrierDraft = {
  name: '', phone: '', base_weight: 20, base_price: 150,
  extra_per_kg: 10, is_active: true, notes: '',
};

const EMPTY_ZONE: ZoneDraft = {
  name: '', surcharge: 50, description: '', is_active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fp(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function calcShipping(c: Carrier, weight: number): number {
  if (weight <= 0) return c.base_price;
  if (weight <= c.base_weight) return c.base_price;
  return c.base_price + (weight - c.base_weight) * c.extra_per_kg;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-kv-navy text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold">
      <CheckCircle size={16} className="text-green-400 shrink-0" />
      {message}
    </div>
  );
}

// ─── CarrierForm ──────────────────────────────────────────────────────────────

function CarrierForm({
  form, setForm, onSave, onCancel, saving, isNew,
}: {
  form: CarrierDraft;
  setForm: React.Dispatch<React.SetStateAction<CarrierDraft>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  return (
    <div className="bg-kv-navy/5 rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
        {isNew ? 'ขนส่งใหม่' : 'แก้ไขขนส่ง'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อขนส่ง *</label>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="เช่น Kerry Express"
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">เบอร์โทรติดต่อ</label>
          <input
            value={form.phone}
            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="0xx-xxx-xxxx"
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">น้ำหนักฐาน (kg)</label>
          <input
            type="number" min="0" step="0.5"
            value={form.base_weight}
            onChange={e => setForm(prev => ({ ...prev, base_weight: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange text-right"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">ราคาฐานครอบคลุมถึง n kg</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">ราคาฐาน (฿)</label>
          <input
            type="number" min="0"
            value={form.base_price}
            onChange={e => setForm(prev => ({ ...prev, base_price: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange text-right"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">ค่าส่งสำหรับ ≤ น้ำหนักฐาน</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">เพิ่มต่อ kg (฿)</label>
          <input
            type="number" min="0" step="0.5"
            value={form.extra_per_kg}
            onChange={e => setForm(prev => ({ ...prev, extra_per_kg: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange text-right"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">ค่าส่งเพิ่มต่อ kg ที่เกิน</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 mb-1 block">หมายเหตุ</label>
        <input
          value={form.notes}
          onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
        />
      </div>

      {form.name && (
        <div className="bg-white rounded-xl p-3 text-xs text-gray-500 border border-gray-100">
          <span className="font-bold text-kv-navy">{form.name}:</span>{' '}
          ≤{fp(form.base_weight)} kg = {fp(form.base_price)} ฿{' '}
          {form.extra_per_kg > 0 && `| ส่วนเกิน +${fp(form.extra_per_kg)} ฿/kg`}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
          ยกเลิก
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึก
        </button>
      </div>
    </div>
  );
}

// ─── ZoneForm ─────────────────────────────────────────────────────────────────

function ZoneForm({
  form, setForm, onSave, onCancel, saving, isNew,
}: {
  form: ZoneDraft;
  setForm: React.Dispatch<React.SetStateAction<ZoneDraft>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  return (
    <div className="bg-kv-navy/5 rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
        {isNew ? 'โซนใหม่' : 'แก้ไขโซน'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อโซน *</label>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="เช่น พื้นที่ห่างไกล"
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">ค่าธรรมเนียมเพิ่ม (฿)</label>
          <input
            type="number" min="0"
            value={form.surcharge}
            onChange={e => setForm(prev => ({ ...prev, surcharge: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange text-right"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 mb-1 block">จังหวัด / รายละเอียดพื้นที่</label>
        <textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="เช่น แม่ฮ่องสอน, น่าน, เลย, ..."
          className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
          ยกเลิก
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึก
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminShipping() {
  const [tab, setTab] = useState<'carriers' | 'zones'>('carriers');
  const [toast, setToast] = useState<string | null>(null);

  // Carriers
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [editingCarrier, setEditingCarrier] = useState<string | null>(null);
  const [carrierForm, setCarrierForm] = useState<CarrierDraft>({ ...EMPTY_CARRIER });
  const [carrierSaving, setCarrierSaving] = useState(false);

  // Zones
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneDraft>({ ...EMPTY_ZONE });
  const [zoneSaving, setZoneSaving] = useState(false);

  // Calculator
  const [calcCarrierId, setCalcCarrierId] = useState('');
  const [calcWeight, setCalcWeight] = useState<number | ''>('');
  const [calcZoneId, setCalcZoneId] = useState('');

  useEffect(() => {
    supabase.from('carriers').select('*').order('created_at')
      .then(({ data }) => { setCarriers((data as Carrier[]) || []); setCarriersLoading(false); });
    supabase.from('delivery_zones').select('*').order('created_at')
      .then(({ data }) => { setZones((data as DeliveryZone[]) || []); setZonesLoading(false); });
  }, []);

  // ── Carrier CRUD ──────────────────────────────────────────────────────────

  async function saveCarrier() {
    if (!carrierForm.name.trim()) return;
    setCarrierSaving(true);
    try {
      if (editingCarrier === 'new') {
        const { data, error } = await supabase.from('carriers').insert(carrierForm).select().single();
        if (error) throw error;
        setCarriers(prev => [...prev, data as Carrier]);
        setToast('เพิ่มขนส่งแล้ว');
      } else {
        const { error } = await supabase.from('carriers').update(carrierForm).eq('id', editingCarrier);
        if (error) throw error;
        setCarriers(prev => prev.map(c => c.id === editingCarrier ? { ...c, ...carrierForm } : c));
        setToast('บันทึกแล้ว');
      }
      setEditingCarrier(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setCarrierSaving(false);
    }
  }

  async function deleteCarrier(id: string) {
    if (!confirm('ลบขนส่งนี้ใช่หรือไม่?')) return;
    const { error } = await supabase.from('carriers').delete().eq('id', id);
    if (!error) { setCarriers(prev => prev.filter(c => c.id !== id)); setToast('ลบแล้ว'); }
  }

  async function toggleCarrierActive(c: Carrier) {
    const { error } = await supabase.from('carriers').update({ is_active: !c.is_active }).eq('id', c.id);
    if (!error) setCarriers(prev => prev.map(r => r.id === c.id ? { ...r, is_active: !r.is_active } : r));
  }

  function startEditCarrier(c: Carrier) {
    setCarrierForm({ name: c.name, phone: c.phone, base_weight: c.base_weight, base_price: c.base_price, extra_per_kg: c.extra_per_kg, is_active: c.is_active, notes: c.notes });
    setEditingCarrier(c.id);
  }

  // ── Zone CRUD ─────────────────────────────────────────────────────────────

  async function saveZone() {
    if (!zoneForm.name.trim()) return;
    setZoneSaving(true);
    try {
      if (editingZone === 'new') {
        const { data, error } = await supabase.from('delivery_zones').insert(zoneForm).select().single();
        if (error) throw error;
        setZones(prev => [...prev, data as DeliveryZone]);
        setToast('เพิ่มโซนแล้ว');
      } else {
        const { error } = await supabase.from('delivery_zones').update(zoneForm).eq('id', editingZone);
        if (error) throw error;
        setZones(prev => prev.map(z => z.id === editingZone ? { ...z, ...zoneForm } : z));
        setToast('บันทึกแล้ว');
      }
      setEditingZone(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setZoneSaving(false);
    }
  }

  async function deleteZone(id: string) {
    if (!confirm('ลบโซนนี้ใช่หรือไม่?')) return;
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (!error) { setZones(prev => prev.filter(z => z.id !== id)); setToast('ลบแล้ว'); }
  }

  function startEditZone(z: DeliveryZone) {
    setZoneForm({ name: z.name, surcharge: z.surcharge, description: z.description, is_active: z.is_active });
    setEditingZone(z.id);
  }

  // ── Calculator ────────────────────────────────────────────────────────────

  const calcCarrier = carriers.find(c => c.id === calcCarrierId) || null;
  const calcZone = zones.find(z => z.id === calcZoneId) || null;
  const calcW = typeof calcWeight === 'number' ? calcWeight : 0;
  const calcBase = calcCarrier ? calcShipping(calcCarrier, calcW) : 0;
  const calcZoneFee = calcZone ? calcZone.surcharge : 0;
  const calcTotal = calcBase + calcZoneFee;
  const showCalcResult = calcCarrier !== null && calcW > 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="mb-4">
        <h1 className="text-2xl font-black text-kv-navy">จัดการขนส่ง</h1>
        <p className="text-sm text-gray-500 mt-0.5">กำหนดขนส่ง ราคา และโซนพื้นที่จัดส่ง</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'carriers' as const, Icon: Truck, label: `ขนส่ง (${carriers.length})` },
          { key: 'zones' as const, Icon: MapPin, label: `โซนพื้นที่ (${zones.length})` },
        ]).map(({ key, Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === key ? 'bg-white text-kv-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Carriers ── */}
      {tab === 'carriers' && (
        <div className="space-y-5">
          {/* Calculator */}
          <div className="bg-gradient-to-br from-kv-navy/5 to-kv-orange/5 rounded-2xl border border-kv-navy/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={16} className="text-kv-orange" />
              <h2 className="text-sm font-black text-kv-navy">คำนวณค่าส่ง</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">ขนส่ง</label>
                <select
                  value={calcCarrierId}
                  onChange={e => setCalcCarrierId(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
                >
                  <option value="">-- เลือกขนส่ง --</option>
                  {carriers.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">น้ำหนัก (kg)</label>
                <input
                  type="number" min="0" step="0.1"
                  value={calcWeight}
                  onChange={e => setCalcWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">โซนพื้นที่</label>
                <select
                  value={calcZoneId}
                  onChange={e => setCalcZoneId(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-kv-orange"
                >
                  <option value="">-- ไม่มี --</option>
                  {zones.filter(z => z.is_active).map(z => (
                    <option key={z.id} value={z.id}>{z.name} (+{fp(z.surcharge)} ฿)</option>
                  ))}
                </select>
              </div>
            </div>

            {showCalcResult ? (
              <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1 text-sm">
                  <div className="text-gray-500">
                    ค่าส่งฐาน ({calcW} kg):{' '}
                    <span className="font-bold text-gray-700">{fp(calcBase)} ฿</span>
                  </div>
                  {calcZoneFee > 0 && (
                    <div className="text-gray-500">
                      ค่าธรรมเนียมโซน:{' '}
                      <span className="font-bold text-gray-700">+{fp(calcZoneFee)} ฿</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">ค่าส่งรวม</div>
                  <div className="text-2xl font-black text-kv-orange">{fp(calcTotal)} ฿</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-2">เลือกขนส่งและใส่น้ำหนักเพื่อคำนวณ</div>
            )}
          </div>

          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setCarrierForm({ ...EMPTY_CARRIER }); setEditingCarrier('new'); }}
              disabled={editingCarrier !== null}
              className="flex items-center gap-2 px-4 py-2 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors disabled:opacity-50"
            >
              <Plus size={15} /> เพิ่มขนส่ง
            </button>
          </div>

          {editingCarrier === 'new' && (
            <CarrierForm
              form={carrierForm} setForm={setCarrierForm}
              onSave={saveCarrier} onCancel={() => setEditingCarrier(null)}
              saving={carrierSaving} isNew
            />
          )}

          {carriersLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-kv-orange" />
            </div>
          ) : carriers.length === 0 && editingCarrier !== 'new' ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 font-bold">
              ยังไม่มีขนส่ง — กดเพิ่มขนส่งด้านบน
            </div>
          ) : (
            <div className="space-y-3">
              {carriers.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {editingCarrier === c.id ? (
                    <div className="p-5">
                      <CarrierForm
                        form={carrierForm} setForm={setCarrierForm}
                        onSave={saveCarrier} onCancel={() => setEditingCarrier(null)}
                        saving={carrierSaving} isNew={false}
                      />
                    </div>
                  ) : (
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-kv-navy/10 rounded-xl flex items-center justify-center text-kv-navy shrink-0">
                          <Truck size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-kv-navy text-base">{c.name}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {c.is_active ? 'เปิดใช้' : 'ปิด'}
                            </span>
                          </div>
                          {c.phone && <div className="text-xs text-gray-400 mt-0.5">โทร: {c.phone}</div>}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg">
                              ≤{fp(c.base_weight)} kg = {fp(c.base_price)} ฿
                            </span>
                            {c.extra_per_kg > 0 && (
                              <span className="text-xs bg-orange-50 text-kv-orange font-bold px-2.5 py-1 rounded-lg">
                                ส่วนเกิน +{fp(c.extra_per_kg)} ฿/kg
                              </span>
                            )}
                          </div>
                          {c.notes && <div className="text-xs text-gray-400 mt-1.5 italic">{c.notes}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => toggleCarrierActive(c)}
                          title={c.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          className={`p-2 rounded-xl transition-colors ${
                            c.is_active
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {c.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => startEditCarrier(c)}
                          disabled={editingCarrier !== null}
                          title="แก้ไข"
                          className="p-2 bg-kv-navy/10 text-kv-navy rounded-xl hover:bg-kv-navy/20 transition-colors disabled:opacity-40"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteCarrier(c.id)}
                          title="ลบ"
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Zones ── */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setZoneForm({ ...EMPTY_ZONE }); setEditingZone('new'); }}
              disabled={editingZone !== null}
              className="flex items-center gap-2 px-4 py-2 bg-kv-navy text-white rounded-xl text-sm font-bold hover:bg-kv-navy/90 transition-colors disabled:opacity-50"
            >
              <Plus size={15} /> เพิ่มโซน
            </button>
          </div>

          {editingZone === 'new' && (
            <ZoneForm
              form={zoneForm} setForm={setZoneForm}
              onSave={saveZone} onCancel={() => setEditingZone(null)}
              saving={zoneSaving} isNew
            />
          )}

          {zonesLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-kv-orange" />
            </div>
          ) : zones.length === 0 && editingZone !== 'new' ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 font-bold">
              ยังไม่มีโซนพื้นที่ — กดเพิ่มโซนด้านบน
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr className="text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-black">ชื่อโซน</th>
                      <th className="p-4 font-black text-right">ค่าเพิ่ม (฿)</th>
                      <th className="p-4 font-black">จังหวัด / รายละเอียด</th>
                      <th className="p-4 font-black">สถานะ</th>
                      <th className="p-4 font-black text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {zones.map(z => (
                      <tr key={z.id} className="hover:bg-gray-50/50">
                        {editingZone === z.id ? (
                          <td colSpan={5} className="p-4">
                            <ZoneForm
                              form={zoneForm} setForm={setZoneForm}
                              onSave={saveZone} onCancel={() => setEditingZone(null)}
                              saving={zoneSaving} isNew={false}
                            />
                          </td>
                        ) : (
                          <>
                            <td className="p-4 font-bold text-kv-navy">{z.name}</td>
                            <td className="p-4 text-right font-black text-kv-orange">+{fp(z.surcharge)}</td>
                            <td className="p-4 text-sm text-gray-500 max-w-[240px]">
                              <span className="line-clamp-2">{z.description || '—'}</span>
                            </td>
                            <td className="p-4">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                z.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {z.is_active ? 'เปิดใช้' : 'ปิด'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  onClick={() => startEditZone(z)}
                                  disabled={editingZone !== null}
                                  className="p-1.5 bg-kv-navy/10 text-kv-navy rounded-lg hover:bg-kv-navy/20 transition-colors disabled:opacity-40"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => deleteZone(z.id)}
                                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-100">
            <strong>วิธีใช้:</strong> โซนพื้นที่ใช้บวกค่าส่งเพิ่มสำหรับพื้นที่ห่างไกล
            ค่าธรรมเนียมจะถูกบวกเพิ่มจากค่าส่งฐานของแต่ละขนส่ง เช่น พื้นที่ห่างไกล +50 ฿
          </div>
        </div>
      )}
    </div>
  );
}
