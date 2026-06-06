import React, { useState, useEffect } from 'react';
import { Truck, Plus, Check, RefreshCw, DollarSign, Activity } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function Couriers() {
  const [couriers, setCouriers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cashAdvance, setCashAdvance] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Adjust Cash advance
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // 'add' or 'subtract'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/couriers/`),
        fetch(`${API_BASE}/courier-logs/`)
      ]);
      const cours = await courRes.json();
      const lgs = await logsRes.json();
      setCouriers(cours);
      setLogs(lgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourier = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch(`${API_BASE}/couriers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          cash_advance_amount: parseFloat(cashAdvance || 0),
          status: 'available'
        })
      });

      if (res.ok) {
        setName('');
        setPhone('');
        setCashAdvance('');
        setShowAddForm(false);
        fetchData();
        alert('Kurye başarıyla tanımlandı.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'on_delivery' : 'available';
    try {
      const res = await fetch(`${API_BASE}/couriers/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustAdvance = async (e) => {
    e.preventDefault();
    if (!selectedCourier || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    let newAmount = parseFloat(selectedCourier.cash_advance_amount);

    if (adjustType === 'add') {
      newAmount += amount;
    } else {
      newAmount -= amount;
    }

    try {
      const res = await fetch(`${API_BASE}/couriers/${selectedCourier.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cash_advance_amount: newAmount })
      });

      if (res.ok) {
        setSelectedCourier(null);
        setAdjustAmount('');
        fetchData();
        alert('Kurye kasası / avansı güncellendi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
      
      {/* Couriers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Kurye Durum ve Paraüstü Takibi</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '8px' }}>
                <RefreshCw size={16} />
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', padding: '8px 16px' }}>
                <Plus size={16} /> Kurye Ekle
              </button>
            </div>
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {couriers.map(c => (
                <div key={c.id} style={{ padding: '16px', border: '1px solid var(--panel-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '16px' }}>{c.name}</span>
                    <span 
                      onClick={() => handleUpdateStatus(c.id, c.status)}
                      className={`badge ${c.status === 'available' ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {c.status === 'available' ? 'Müsait' : 'Teslimatta'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div>Telefon: {c.phone || 'Girilmedi'}</div>
                    <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Taşınan Paraüstü Avansı:</span>
                      <strong style={{ color: 'var(--success)', fontSize: '15px' }}>{parseFloat(c.cash_advance_amount).toLocaleString('tr-TR')} ₺</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setSelectedCourier(c)}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                    >
                      Paraüstü Düzenle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courier Logs */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Son Kurye Teslimatları</h3>
          <div className="table-container">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Kurye</th>
                  <th>Sipariş</th>
                  <th>Zaman</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 8).map(log => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: '600' }}>
                      {couriers.find(c => c.id === log.courier)?.name || 'Kurye'}
                    </td>
                    <td>Sipariş #{log.order}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className="badge badge-success">Teslim Edildi</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Forms Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Adjust Advance Form */}
        {selectedCourier && (
          <div className="card" style={{ border: '1px solid var(--primary)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Paraüstü Avansını Düzenle: <br /> <span style={{ color: 'var(--primary)' }}>{selectedCourier.name}</span>
            </h3>
            <form onSubmit={handleAdjustAdvance}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  type="button" 
                  className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                  onClick={() => setAdjustType('add')}
                >
                  Ekle
                </button>
                <button 
                  type="button" 
                  className={`btn ${adjustType === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                  onClick={() => setAdjustType('subtract')}
                >
                  Geri Al
                </button>
              </div>
              <div className="form-group">
                <label>Tutar (TL)</label>
                <input type="number" step="0.01" className="form-control" placeholder="0.00" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCourier(null)}>Vazgeç</button>
              </div>
            </form>
          </div>
        )}

        {/* Add Courier Form */}
        {showAddForm && (
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Kurye Kaydı</h3>
            <form onSubmit={handleCreateCourier}>
              <div className="form-group">
                <label>Kurye Adı *</label>
                <input type="text" className="form-control" placeholder="örn: Murat Can" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input type="text" className="form-control" placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Açılış Paraüstü Avansı</label>
                <input type="number" step="0.01" className="form-control" placeholder="100.00" value={cashAdvance} onChange={(e) => setCashAdvance(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Kuryeyi Kaydet
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
