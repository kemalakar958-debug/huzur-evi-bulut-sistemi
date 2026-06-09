'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { supabase } from '@/lib/supabaseClient';

type Facility = Record<string, any>;
type RequestRow = Record<string, any>;

export default function InterfacilityRequestsPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [depotItems, setDepotItems] = useState<Record<string, any[]>>({});
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({
    requesting_facility_id: '',
    product_name: '',
    category: 'İlaç',
    requested_qty: '1',
    priority: 'Normal',
    note: '',
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || '';

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(profileRow || null);

    const { data: facilityRows } = await supabase
      .from('facilities')
      .select('*')
      .order('name');

    setFacilities(facilityRows || []);

    const defaultFacility =
      profileRow?.role === 'founder'
        ? facilityRows?.[0]?.id
        : profileRow?.facility_id || facilityRows?.[0]?.id || '';

    setForm((old) => ({
      ...old,
      requesting_facility_id: old.requesting_facility_id || defaultFacility,
    }));

    await loadRequests();
    await loadDepotItems(facilityRows || []);
  }

  async function loadRequests() {
    const { data } = await supabase
      .from('interfacility_stock_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    setRequests(data || []);
  }

  async function loadDepotItems(facilityRows: Facility[]) {
    const next: Record<string, any[]> = {};

    for (const facility of facilityRows) {
      const { data } = await supabase
        .from('depot_items')
        .select('*')
        .eq('facility_id', facility.id)
        .order('name');

      next[facility.id] = data || [];
    }

    setDepotItems(next);
  }

  function facilityName(id: string | null) {
    if (!id) return '-';
    return facilities.find((f) => f.id === id)?.name || '-';
  }

  function isFounder() {
    return profile?.role === 'founder';
  }

  async function createRequest() {
    if (!form.requesting_facility_id) return alert('İsteyen kurum seç.');
    if (!form.product_name) return alert('Ürün adı yaz.');
    if (Number(form.requested_qty) <= 0) return alert('Miktar 1 veya daha büyük olmalı.');

    const requester = facilities.find((f) => f.id === form.requesting_facility_id);

    const { error } = await supabase.from('interfacility_stock_requests').insert({
      requesting_facility_id: form.requesting_facility_id,
      requesting_facility_name: requester?.name || null,
      product_name: form.product_name,
      category: form.category,
      requested_qty: Number(form.requested_qty),
      priority: form.priority,
      note: form.note || null,
      status: 'Bekliyor',
      approval_status: 'Bekliyor',
    });

    if (error) return alert(error.message);

    setForm((old) => ({
      ...old,
      product_name: '',
      requested_qty: '1',
      note: '',
      priority: 'Normal',
    }));

    await loadRequests();
    alert('Kurumlar arası istek oluşturuldu.');
  }

  async function approveRequest(req: RequestRow, approved: boolean) {
    if (!isFounder()) return alert('Sadece patron/founder onay verebilir.');

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('interfacility_stock_requests')
      .update({
        approval_status: approved ? 'Onaylandı' : 'Reddedildi',
        status: approved ? 'Onaylandı' : 'Reddedildi',
        approved_by: userData.user?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    if (error) return alert(error.message);
    await loadRequests();
  }

  async function selectSendingFacility(req: RequestRow, facilityId: string) {
    if (!isFounder()) return alert('Sadece patron/founder gönderen kurum seçebilir.');

    const facility = facilities.find((f) => f.id === facilityId);

    const { error } = await supabase
      .from('interfacility_stock_requests')
      .update({
        sending_facility_id: facilityId || null,
        sending_facility_name: facility?.name || null,
      })
      .eq('id', req.id);

    if (error) return alert(error.message);
    await loadRequests();
  }

  async function sendRequest(req: RequestRow) {
    if (!isFounder()) return alert('Sadece patron/founder gönderim yapabilir.');
    if (!req.sending_facility_id) return alert('Önce hangi kurumdan gönderileceğini seç.');

    const qty = Number(req.requested_qty || 0);
    if (qty <= 0) return alert('Geçersiz miktar.');

    const { data: sourceItem, error: sourceError } = await supabase
      .from('depot_items')
      .select('*')
      .eq('facility_id', req.sending_facility_id)
      .eq('name', req.product_name)
      .maybeSingle();

    if (sourceError) return alert(sourceError.message);
    if (!sourceItem) return alert('Gönderen kurum deposunda bu ürün bulunamadı.');
    if (Number(sourceItem.current_stock || 0) < qty) return alert('Gönderen kurum stoğu yetersiz.');

    const sourceAfter = Number(sourceItem.current_stock || 0) - qty;

    const { error: sourceUpdateError } = await supabase
      .from('depot_items')
      .update({ current_stock: sourceAfter })
      .eq('id', sourceItem.id);

    if (sourceUpdateError) return alert(sourceUpdateError.message);

    const { data: targetItem } = await supabase
      .from('depot_items')
      .select('*')
      .eq('facility_id', req.requesting_facility_id)
      .eq('name', req.product_name)
      .maybeSingle();

    if (targetItem) {
      const targetAfter = Number(targetItem.current_stock || 0) + qty;
      await supabase.from('depot_items').update({ current_stock: targetAfter }).eq('id', targetItem.id);
    } else {
      await supabase.from('depot_items').insert({
        facility_id: req.requesting_facility_id,
        name: req.product_name,
        category: req.category || 'İlaç',
        current_stock: qty,
        min_stock: 0,
        max_stock: 0,
      });
    }

    await supabase.from('interfacility_stock_movements').insert({
      request_id: req.id,
      product_name: req.product_name,
      category: req.category || null,
      qty,
      from_facility_id: req.sending_facility_id,
      from_facility_name: req.sending_facility_name,
      to_facility_id: req.requesting_facility_id,
      to_facility_name: req.requesting_facility_name,
      source_before_stock: Number(sourceItem.current_stock || 0),
      source_after_stock: sourceAfter,
      note: 'Kurumlar arası onaylı stok transferi',
    });

    const { error } = await supabase
      .from('interfacility_stock_requests')
      .update({
        status: 'Gönderildi',
        sent_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    if (error) return alert(error.message);

    await load();
    alert('Transfer tamamlandı. Gönderen kurum stoğundan düşüldü, isteyen kuruma eklendi.');
  }

  const pending = requests.filter((r) => r.status === 'Bekliyor').length;
  const approved = requests.filter((r) => r.status === 'Onaylandı').length;
  const sent = requests.filter((r) => r.status === 'Gönderildi').length;
  const rejected = requests.filter((r) => r.status === 'Reddedildi').length;

  const visibleRequests = isFounder()
    ? requests
    : requests.filter((r) => r.requesting_facility_id === profile?.facility_id);

  return (
    <Shell>
      <div className="hero">
        <h2>Kurumlar Arası Stok İstek</h2>
        <p>Bir kurum istek oluşturur, patron onaylar, hangi kurumdan gönderileceğini seçer ve stok otomatik transfer edilir.</p>
      </div>

      <div className="kpiGrid">
        <div className="kpi"><span>Bekleyen</span><strong>{pending}</strong></div>
        <div className="kpi"><span>Onaylanan</span><strong>{approved}</strong></div>
        <div className="kpi"><span>Gönderildi</span><strong>{sent}</strong></div>
        <div className="kpi"><span>Reddedildi</span><strong>{rejected}</strong></div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>Yeni İstek Oluştur</h2>
            <p>Örn: İlgi 2 serum/ilaç/sarf malzeme isteği açar.</p>
          </div>
        </div>

        <div className="grid grid4">
          <div>
            <label>İsteyen Kurum</label>
            <select
              value={form.requesting_facility_id}
              onChange={(e) => setForm({ ...form, requesting_facility_id: e.target.value })}
              disabled={!isFounder()}
            >
              {facilities
                .filter((f) => isFounder() || f.id === profile?.facility_id)
                .map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div><label>Ürün / İlaç / Malzeme</label><input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></div>

          <div>
            <label>Kategori</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>İlaç</option>
              <option>Serum</option>
              <option>Sarf Malzeme</option>
              <option>Medikal Cihaz</option>
              <option>Temizlik</option>
              <option>Diğer</option>
            </select>
          </div>

          <div><label>Miktar</label><input type="number" value={form.requested_qty} onChange={(e) => setForm({ ...form, requested_qty: e.target.value })} /></div>
        </div>

        <div className="grid grid2">
          <div>
            <label>Öncelik</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option>Normal</option>
              <option>Acil</option>
              <option>Kritik</option>
            </select>
          </div>
          <div><label>Not</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>

        <div className="actions">
          <button className="primary" onClick={createRequest}>İstek Oluştur</button>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <h2>İstek Listesi</h2>
            <p>{isFounder() ? 'Patron tüm kurum isteklerini görür.' : 'Kullanıcı sadece kendi kurum isteklerini görür.'}</p>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>İsteyen Kurum</th>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>Miktar</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th>Gönderen Kurum</th>
                <th>Stok</th>
                <th>Patron İşlemi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((req) => {
                const sourceItems = req.sending_facility_id ? depotItems[req.sending_facility_id] || [] : [];
                const sourceItem = sourceItems.find((x) => x.name === req.product_name);
                return (
                  <tr key={req.id}>
                    <td><b>{req.requesting_facility_name || facilityName(req.requesting_facility_id)}</b></td>
                    <td>{req.product_name}</td>
                    <td>{req.category || '-'}</td>
                    <td>{req.requested_qty}</td>
                    <td><span className={`pill ${req.priority === 'Kritik' ? 'danger' : req.priority === 'Acil' ? 'warn' : 'info'}`}>{req.priority}</span></td>
                    <td><span className={`pill ${req.status === 'Gönderildi' ? 'ok' : req.status === 'Reddedildi' ? 'danger' : req.status === 'Onaylandı' ? 'warn' : 'info'}`}>{req.status}</span></td>
                    <td>
                      {isFounder() && req.status !== 'Gönderildi' ? (
                        <select value={req.sending_facility_id || ''} onChange={(e) => selectSendingFacility(req, e.target.value)}>
                          <option value="">Seç</option>
                          {facilities
                            .filter((f) => f.id !== req.requesting_facility_id)
                            .map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      ) : (
                        req.sending_facility_name || '-'
                      )}
                    </td>
                    <td>{sourceItem ? sourceItem.current_stock : '-'}</td>
                    <td>
                      {isFounder() ? (
                        <div className="actions" style={{ marginTop: 0 }}>
                          {req.status === 'Bekliyor' && <button className="green" onClick={() => approveRequest(req, true)}>Onayla</button>}
                          {req.status === 'Bekliyor' && <button className="red" onClick={() => approveRequest(req, false)}>Reddet</button>}
                          {req.status === 'Onaylandı' && <button className="primary" onClick={() => sendRequest(req)}>Gönder</button>}
                        </div>
                      ) : (
                        <small>Patron onayı beklenir</small>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleRequests.length === 0 && <tr><td colSpan={9}>İstek yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
