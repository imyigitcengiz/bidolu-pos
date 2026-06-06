import React, { useState, useEffect } from 'react';
import { Layers, QrCode, Globe, Users, MessageSquare, Plus, Trash2, Send, Save, ArrowLeft, RefreshCw, CheckCircle2, Play } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function Extensions({ setCurrentTab, activeSubView, setActiveSubView, restaurantProfile, fetchRestaurantProfile }) {
  const handleToggleExtension = async (field, value) => {
    if (!restaurantProfile || !restaurantProfile.id) return;
    try {
      const res = await fetch(`${API_BASE}/restaurant-profile/${restaurantProfile.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        fetchRestaurantProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CRM State
  const [customers, setCustomers] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // WhatsApp Config State
  const [waConfig, setWaConfig] = useState({
    id: null,
    api_key: '',
    phone_number_id: '',
    is_auto_message_enabled: false,
    message_template: ''
  });
  const [loadingWa, setLoadingWa] = useState(false);

  // WhatsApp Campaign State
  const [campaignSegment, setCampaignSegment] = useState('all'); // 'all', 'passive'
  const [campaignMessage, setCampaignMessage] = useState('Merhaba {customer_name}, size özel sürpriz indirimler ve yeni lezzetlerimiz Bidolu POS kalitesiyle kapınızda! Hızlı sipariş için sitemizi ziyaret edin.');
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(0);

  useEffect(() => {
    fetchCustomers();
    fetchWhatsAppConfig();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCrm(true);
      const res = await fetch(`${API_BASE}/customers/`);
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCrm(false);
    }
  };

  const fetchWhatsAppConfig = async () => {
    try {
      setLoadingWa(true);
      const res = await fetch(`${API_BASE}/whatsapp-configs/`);
      const data = await res.json();
      if (data && data.length > 0) {
        setWaConfig(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWa(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const res = await fetch(`${API_BASE}/customers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          email: newCustEmail,
          total_orders: 0
        })
      });

      if (res.ok) {
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        fetchCustomers();
        alert('Müşteri başarıyla CRM listesine eklendi.');
      } else {
        const errData = await res.json();
        alert(`Hata: ${errData.phone ? 'Bu telefon numarası zaten kayıtlı.' : 'Kayıt başarısız.'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`${API_BASE}/customers/${id}/`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWhatsAppConfig = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (waConfig.id) {
        res = await fetch(`${API_BASE}/whatsapp-configs/${waConfig.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(waConfig)
        });
      } else {
        res = await fetch(`${API_BASE}/whatsapp-configs/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(waConfig)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setWaConfig(data);
        alert('WhatsApp API ayarları başarıyla kaydedildi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartCampaign = async () => {
    if (customers.length === 0) {
      alert('Kampanya başlatmak için önce en az bir müşteri bulunmalıdır.');
      return;
    }

    setCampaignRunning(true);
    setCampaignProgress(0);
    setCampaignLogs([]);

    // Filter recipients based on segment
    const recipients = campaignSegment === 'all' 
      ? customers 
      : customers.filter(c => c.total_orders <= 10); // Simulated passive segment

    try {
      const res = await fetch(`${API_BASE}/whatsapp-configs/send_campaign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: campaignMessage,
          recipients: recipients
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Simulate progress bar and feed logging
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setCampaignProgress(Math.floor((count / data.logs.length) * 100));
          setCampaignLogs(data.logs.slice(0, count));

          if (count >= data.logs.length) {
            clearInterval(interval);
            setCampaignRunning(false);
            alert('WhatsApp Kampanyası başarıyla tamamlandı!');
          }
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setCampaignRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {activeSubView === null ? (
        <>
          {/* Main Extensions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            
            {/* QR Menu Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--panel-border)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: restaurantProfile.ext_qr_menu_enabled ? 'var(--success)' : 'var(--text-muted)' }}>
                      {restaurantProfile.ext_qr_menu_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={restaurantProfile.ext_qr_menu_enabled}
                      onChange={(e) => handleToggleExtension('ext_qr_menu_enabled', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>QR Menü</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Masalardan veya adresten QR kod okutarak sipariş alın, menü temalarını yönetin.</p>
              </div>
              <button 
                onClick={() => setCurrentTab('qr-menu')} 
                disabled={!restaurantProfile.ext_qr_menu_enabled}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '8px', opacity: restaurantProfile.ext_qr_menu_enabled ? 1 : 0.5 }}
              >
                {restaurantProfile.ext_qr_menu_enabled ? 'Yönetime Git' : 'Aktif Etmek İçin Açın'}
              </button>
            </div>

            {/* Official Website Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--panel-border)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: restaurantProfile.ext_official_website_enabled ? 'var(--success)' : 'var(--text-muted)' }}>
                      {restaurantProfile.ext_official_website_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={restaurantProfile.ext_official_website_enabled}
                      onChange={(e) => handleToggleExtension('ext_official_website_enabled', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Tanıtım Web Sitesi</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Kendi özel alan adınız, tasarımlarınız, rezervasyon formu ve hikayenizle web sitenizi oluşturun.</p>
              </div>
              <button 
                onClick={() => setCurrentTab('official-website')} 
                disabled={!restaurantProfile.ext_official_website_enabled}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '8px', opacity: restaurantProfile.ext_official_website_enabled ? 1 : 0.5 }}
              >
                {restaurantProfile.ext_official_website_enabled ? 'Yönetime Git' : 'Aktif Etmek İçin Açın'}
              </button>
            </div>

            {/* Customer CRM Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--panel-border)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: restaurantProfile.ext_crm_enabled ? 'var(--success)' : 'var(--text-muted)' }}>
                      {restaurantProfile.ext_crm_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={restaurantProfile.ext_crm_enabled}
                      onChange={(e) => handleToggleExtension('ext_crm_enabled', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Müşteriler (CRM)</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Müşteri tabanınızı oluşturun, toplam sipariş sayılarını, e-postalarını ve telefon rehberini takip edin.</p>
              </div>
              <button 
                onClick={() => setActiveSubView('crm')} 
                disabled={!restaurantProfile.ext_crm_enabled}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '8px', opacity: restaurantProfile.ext_crm_enabled ? 1 : 0.5 }}
              >
                {restaurantProfile.ext_crm_enabled ? 'Müşterileri Yönet' : 'Aktif Etmek İçin Açın'}
              </button>
            </div>

            {/* WhatsApp API Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px', background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--panel-border)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: restaurantProfile.ext_whatsapp_enabled ? 'var(--success)' : 'var(--text-muted)' }}>
                      {restaurantProfile.ext_whatsapp_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={restaurantProfile.ext_whatsapp_enabled}
                      onChange={(e) => handleToggleExtension('ext_whatsapp_enabled', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>WhatsApp API & Kampanya</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>Sipariş alan müşterilere otomatik onay iletin, müşteri gruplarına WhatsApp kampanyaları düzenleyin.</p>
              </div>
              <button 
                onClick={() => setActiveSubView('whatsapp')} 
                disabled={!restaurantProfile.ext_whatsapp_enabled}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '8px', background: restaurantProfile.ext_whatsapp_enabled ? '#25d366' : 'var(--bg-darker)', borderColor: restaurantProfile.ext_whatsapp_enabled ? '#25d366' : 'var(--panel-border)', opacity: restaurantProfile.ext_whatsapp_enabled ? 1 : 0.5 }}
              >
                {restaurantProfile.ext_whatsapp_enabled ? 'WhatsApp API Ayarla' : 'Aktif Etmek İçin Açın'}
              </button>
            </div>

          </div>
        </>
      ) : activeSubView === 'crm' ? (
        <>
          {/* Customer CRM Manager View */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setActiveSubView(null)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
              <ArrowLeft size={14} /> Eklentilere Dön
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ Müşteri CRM</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Customer CRM List */}
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Müşteri Rehberi ({customers.length})</span>
                <button onClick={fetchCustomers} className="action-icon-btn"><RefreshCw size={14} /></button>
              </h3>

              {loadingCrm ? (
                <div className="spinner"></div>
              ) : customers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Müşteri kaydı bulunamadı.</div>
              ) : (
                <div className="table-container">
                  <table className="mgmt-table">
                    <thead>
                      <tr>
                        <th>Müşteri Adı</th>
                        <th>Telefon</th>
                        <th>E-posta</th>
                        <th style={{ textAlign: 'center' }}>Sipariş Sayısı</th>
                        <th>Son Sipariş Tarihi</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: '600' }}>{c.name}</td>
                          <td>{c.phone}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{c.email || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{c.total_orders}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{c.last_order_date || 'Hiç Sipariş Yok'}</td>
                          <td>
                            <button onClick={() => handleDeleteCustomer(c.id)} className="action-icon-btn delete"><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Customer Add Form */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Yeni Müşteri Ekle</h3>
              <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Müşteri Ad Soyad *</label>
                  <input type="text" className="form-control" placeholder="örn: Canan Dağdeviren" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Telefon Numarası *</label>
                  <input type="text" className="form-control" placeholder="örn: 0555 444 33 22" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>E-posta Adresi</label>
                  <input type="email" className="form-control" placeholder="örn: canan@mail.com" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                  <Plus size={16} /> Müşteriyi CRM'e Kaydet
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* WhatsApp API View */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setActiveSubView(null)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
              <ArrowLeft size={14} /> Eklentilere Dön
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ WhatsApp API Otomasyonu</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '24px' }}>
            {/* Configuration */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#25d366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} /> API Entegrasyon Ayarları
              </h3>
              
              {loadingWa ? (
                <div className="spinner"></div>
              ) : (
                <form onSubmit={handleSaveWhatsAppConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>WhatsApp Cloud API Access Token</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="wh_live_token_..." 
                      value={waConfig.api_key || ''} 
                      onChange={(e) => setWaConfig({ ...waConfig, api_key: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Phone Number ID</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="örn: 10984852" 
                      value={waConfig.phone_number_id || ''} 
                      onChange={(e) => setWaConfig({ ...waConfig, phone_number_id: e.target.value })}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Otomatik Sipariş Bildirimleri</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sipariş tamamlandığında otomatik WhatsApp mesajı gönderilir.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={waConfig.is_auto_message_enabled}
                      onChange={(e) => setWaConfig({ ...waConfig, is_auto_message_enabled: e.target.checked })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Otomatik Sipariş Onay Şablonu</label>
                    <textarea 
                      className="form-control" 
                      rows="4" 
                      value={waConfig.message_template || ''} 
                      onChange={(e) => setWaConfig({ ...waConfig, message_template: e.target.value })}
                      placeholder="Değişkenler: {customer_name}, {order_id}"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', background: '#25d366', borderColor: '#25d366' }}>
                    <Save size={16} /> API Entegrasyonunu Kaydet
                  </button>
                </form>
              )}
            </div>

            {/* Campaign Planner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="card">
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={18} /> Toplu WhatsApp Kampanyası Planlayıcı
                </h3>
                
                <div className="form-group">
                  <label>Müşteri Segmenti Seçin</label>
                  <select className="form-control form-select" value={campaignSegment} onChange={(e) => setCampaignSegment(e.target.value)}>
                    <option value="all">Tüm Kayıtlı CRM Müşterileri ({customers.length})</option>
                    <option value="passive">Pasif Müşteriler (Sipariş Sayısı ≤ 10)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Kampanya Mesajı</label>
                  <textarea 
                    className="form-control" 
                    rows="4" 
                    value={campaignMessage} 
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    placeholder="Müşterilere gidecek kampanya yazısı..."
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    İpucu: Kişiselleştirmek için <strong>{'{customer_name}'}</strong> etiketini kullanabilirsiniz.
                  </small>
                </div>

                <button 
                  className="btn btn-primary" 
                  disabled={campaignRunning} 
                  onClick={handleStartCampaign}
                  style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', background: '#0284c7', borderColor: '#0284c7' }}
                >
                  <Play size={16} /> {campaignRunning ? 'Kampanya Gönderiliyor...' : 'Kampanyayı Başlat (WhatsApp API)'}
                </button>
              </div>

              {/* Campaign Logs Tracker */}
              {(campaignRunning || campaignLogs.length > 0) && (
                <div className="card">
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Kampanya Gönderim Raporu</h3>
                  
                  {campaignRunning && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span>Gönderim İlerlemesi</span>
                        <strong>%{campaignProgress}</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${campaignProgress}%`, height: '100%', background: '#25d366', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  )}

                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {campaignLogs.map(log => (
                      <div 
                        key={log.id} 
                        style={{ 
                          padding: '10px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--panel-border)', 
                          background: 'rgba(255,255,255,0.01)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block' }}>{log.customer}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.phone} ➜ "{log.message_preview.substring(0, 45)}..."</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#25d366', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
}
