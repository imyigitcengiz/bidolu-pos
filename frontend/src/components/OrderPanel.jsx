import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check, Clock, Truck, RefreshCw, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const PLATFORM_COLORS = {
  'Yemeksepeti': { bg: 'rgba(225, 27, 34, 0.15)', text: '#e11b22', border: 'rgba(225, 27, 34, 0.3)' },
  'Getir': { bg: 'rgba(93, 56, 198, 0.15)', text: '#a855f7', border: 'rgba(93, 56, 198, 0.3)' },
  'Trendyol Yemek': { bg: 'rgba(242, 122, 26, 0.15)', text: '#f27a1a', border: 'rgba(242, 122, 26, 0.3)' },
  'Migros Yemek': { bg: 'rgba(255, 106, 0, 0.15)', text: '#ff8a00', border: 'rgba(255, 106, 0, 0.3)' },
  'WebSitesi': { bg: 'rgba(37, 99, 235, 0.15)', text: '#3b82f6', border: 'rgba(37, 99, 235, 0.3)' }
};

export default function OrderPanel() {
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Yemeksepeti', etc.
  const [loading, setLoading] = useState(true);
  
  // Simulating/Adding orders dialog
  const [showSimulateForm, setShowSimulateForm] = useState(false);
  const [simChannel, setSimChannel] = useState('');
  const [simName, setSimName] = useState('');
  const [simTotal, setSimTotal] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, courRes, chanRes] = await Promise.all([
        fetch(`${API_BASE}/orders/`),
        fetch(`${API_BASE}/couriers/`),
        fetch(`${API_BASE}/order-channels/`)
      ]);
      const ords = await ordRes.json();
      const cours = await courRes.json();
      const chans = await chanRes.json();
      
      setOrders(ords);
      setCouriers(cours);
      setChannels(chans);
      if (chans.length > 0) {
        setSimChannel(chans[0].name);
      }
    } catch (err) {
      console.error('Veriler çekilirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/`, {
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

  const handleAssignCourier = async (orderId, courierId) => {
    try {
      // Create courier log
      const res = await fetch(`${API_BASE}/courier-logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderId,
          courier: courierId,
          status: 'assigned'
        })
      });
      if (res.ok) {
        // Update order status to ready/preparing or keep track
        await handleUpdateStatus(orderId, 'ready');
        alert('Kurye başarıyla atandı!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateOrder = async (e) => {
    e.preventDefault();
    if (!simName || !simTotal) return;

    try {
      // Find the virtual table matching channel
      const tableName = `${simChannel} Paket`;
      // Fetch tables to get the ID
      const tRes = await fetch(`${API_BASE}/tables/`);
      const tables = await tRes.json();
      let table = tables.find(t => t.name === tableName);
      if (!table) {
        // Create table if not exist
        const tCreate = await fetch(`${API_BASE}/tables/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tableName, status: 'occupied', capacity: 1 })
        });
        table = await tCreate.json();
      }

      // Create Order
      const oRes = await fetch(`${API_BASE}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: table.id,
          status: 'preparing',
          total_amount: parseFloat(simTotal),
          items: [] // simulated empty/external items
        })
      });

      if (oRes.ok) {
        alert('Simüle Sipariş başarıyla oluşturuldu!');
        setSimName('');
        setSimTotal('');
        setShowSimulateForm(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders that belong to delivery tables
  const deliveryOrders = orders.filter(o => o.table_name && o.table_name.includes('Paket'));

  // Get matching platform branding
  const getPlatformBranding = (tableName) => {
    const cleanName = tableName.replace(' Paket', '');
    return PLATFORM_COLORS[cleanName] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'rgba(255,255,255,0.1)' };
  };

  const filteredOrders = activeTab === 'All' 
    ? deliveryOrders 
    : deliveryOrders.filter(o => o.table_name.startsWith(activeTab));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('All')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Tümü ({deliveryOrders.length})
          </button>
          {channels.map(ch => {
            const count = deliveryOrders.filter(o => o.table_name.startsWith(ch.name)).length;
            return (
              <button 
                key={ch.id}
                className={`btn ${activeTab === ch.name ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(ch.name)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {ch.name} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '10px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowSimulateForm(true)} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 16px' }}>
            <Plus size={16} /> Sipariş Simüle Et
          </button>
        </div>
      </div>

      {/* Simulation Modal */}
      {showSimulateForm && (
        <div className="card" style={{ maxWidth: '450px', border: '1px solid var(--primary)', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Sipariş Simüle Edin</h3>
          <form onSubmit={handleSimulateOrder}>
            <div className="form-group">
              <label>Kanal Seçin</label>
              <select className="form-control form-select" value={simChannel} onChange={(e) => setSimChannel(e.target.value)}>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.name}>{ch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Müşteri Adı / Sipariş No</label>
              <input type="text" className="form-control" placeholder="örn: Ahmet Y. #9901" value={simName} onChange={(e) => setSimName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Tutar (TL)</label>
              <input type="number" step="0.01" className="form-control" placeholder="örn: 340.00" value={simTotal} onChange={(e) => setSimTotal(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Sipariş Gönder</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSimulateForm(false)}>Vazgeç</button>
            </div>
          </form>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="spinner"></div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>Aktif teslimat / paket siparişi bulunmamaktadır.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOrders.map(order => {
            const branding = getPlatformBranding(order.table_name);
            return (
              <div 
                className="card" 
                key={order.id} 
                style={{ 
                  borderColor: branding.border, 
                  background: `linear-gradient(135deg, ${branding.bg}, rgba(18, 20, 29, 0.8))`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      textTransform: 'uppercase', 
                      color: branding.text,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${branding.border}`
                    }}
                  >
                    {order.table_name.replace(' Paket', '')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    #{order.id} | {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Tutar: {parseFloat(order.total_amount).toLocaleString('tr-TR')} ₺</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Durum: <span style={{ color: order.status === 'completed' ? 'var(--success)' : 'var(--warning)', fontWeight: '600' }}>
                      {order.status === 'preparing' ? 'Mutfakta / Hazırlanıyor' : order.status === 'ready' ? 'Kuryede / Yolda' : order.status === 'completed' ? 'Teslim Edildi' : 'İptal'}
                    </span>
                  </p>
                </div>

                {/* Courier Assignment Section */}
                {order.status === 'preparing' && (
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Kurye Ata</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        className="form-control form-select" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignCourier(order.id, e.target.value);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Kurye Seçin...</option>
                        {couriers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.status === 'available' ? 'Müsait' : 'Meşgul'})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  {order.status === 'preparing' && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                    >
                      <Clock size={14} /> Yola Çıkar
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                    >
                      <Check size={14} /> Teslim Edildi
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                    style={{ color: 'var(--danger)', fontSize: '12px', padding: '8px' }}
                  >
                    İptal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
