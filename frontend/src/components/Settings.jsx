import React, { useState, useEffect } from 'react';
import { Settings, Shield, Award, Check, Clock, Edit3, ArrowRight, User, MessageSquare, Save } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

const PLANS = [
  {
    id: 'Starter',
    name: 'Başlangıç (Starter)',
    price: '299 ₺',
    desc: 'Yeni açılan, küçük ölçekli kafe ve büfeler için ideal temel paket.',
    features: [
      '10 Masaya Kadar Destek',
      'Temel Sipariş ve Masa Takibi',
      '1 Mutfak Ekranı',
      'Günlük Satış Raporu'
    ],
    disabledFeatures: [
      'Detaylı Haftalık Analizler',
      'Öncelikli 7/24 Destek',
      'Eklentiler (QR Menü, Web Sitesi, WhatsApp)'
    ]
  },
  {
    id: 'Growth',
    name: 'Büyüyen (Growth)',
    price: '599 ₺',
    desc: 'İşlerini büyüten ve profesyonel kontrol isteyen restoranlar için.',
    features: [
      'Sınırsız Masa Yönetimi',
      'Gelişmiş Sipariş ve Masa Takibi',
      '3 Mutfak Ekranı',
      'Detaylı Satış ve Ürün Analizleri',
      'Haftalık/Aylık Kâr-Zarar Raporu',
      'Öncelikli Destek Hattı',
      'QR Menü Eklentisi (Dahil)',
      'Tanıtım Web Sitesi Eklentisi (Dahil)'
    ],
    disabledFeatures: [
      'WhatsApp Kampanyaları Eklentisi',
      'Kurye Takip Eklentisi'
    ]
  },
  {
    id: 'Enterprise',
    name: 'Kurumsal (Enterprise)',
    price: 'Özel Fiyat',
    desc: 'Çok şubeli büyük restoran zincirleri ve franchise işletmeler için.',
    features: [
      'Sınırsız Masa & Çoklu Şube',
      'Sınırsız Mutfak Ekranı',
      'API ve Entegrasyon Desteği',
      'Özel Bulut Sunucusu',
      '7/24 Özel Müşteri Temsilcisi',
      'Tüm Eklentiler Dahil (QR Menü, Web Sitesi, WhatsApp, Kurye)'
    ],
    disabledFeatures: []
  }
];

export default function SettingsComponent({ fetchRestaurantProfile: parentFetchProfile }) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const saved = localStorage.getItem('settingsSubTab');
    if (saved) {
      localStorage.removeItem('settingsSubTab'); // Use once and clear
      return saved;
    }
    return 'restaurant';
  }); // 'restaurant', 'profile', 'plans'
  
  // Restaurant Profile state
  const [profileId, setProfileId] = useState(null);
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resAddress, setResAddress] = useState('');
  const [resTaxOffice, setResTaxOffice] = useState('');
  const [resTaxNumber, setResTaxNumber] = useState('');
  const [resHours, setResHours] = useState('');
  const [resPlan, setResPlan] = useState('Growth');
  const [resPlanExpiry, setResPlanExpiry] = useState('');
  const [loading, setLoading] = useState(true);

  // User Profile mock state
  const [username, setUsername] = useState('im.yigit');
  const [email, setEmail] = useState('yigit@bidolupos.com');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // WhatsApp Config state
  const [waConfig, setWaConfig] = useState({
    id: null,
    api_key: '',
    phone_number_id: '',
    is_auto_message_enabled: true,
    message_template: '',
    is_live_chat_enabled: false,
    ask_admin_before_sending: true
  });
  const [loadingWa, setLoadingWa] = useState(false);

  useEffect(() => {
    fetchRestaurantProfile();
    fetchWhatsAppConfig();
  }, []);

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

  const fetchRestaurantProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/restaurant-profile/`);
      const data = await res.json();
      if (data && data.length > 0) {
        const prof = data[0];
        setProfileId(prof.id);
        setResName(prof.name || '');
        setResPhone(prof.phone || '');
        setResAddress(prof.address || '');
        setResTaxOffice(prof.tax_office || '');
        setResTaxNumber(prof.tax_number || '');
        setResHours(prof.working_hours || '09:00 - 23:00');
        setResPlan(prof.active_plan || 'Growth');
        setResPlanExpiry(prof.plan_expiry || '');
      } else {
        // Fallback or create default
        setResName('Bidolu Kebap & Lahmacun');
        setResPlan('Growth');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    const payload = {
      name: resName,
      phone: resPhone,
      address: resAddress,
      tax_office: resTaxOffice,
      tax_number: resTaxNumber,
      working_hours: resHours,
      active_plan: resPlan
    };

    try {
      let res;
      if (profileId) {
        res = await fetch(`${API_BASE}/restaurant-profile/${profileId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/restaurant-profile/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        alert('Restoran bilgileri başarıyla güncellendi.');
        fetchRestaurantProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    alert('Profil bilgileri güncellendi! (Simüle edildi)');
    setOldPass('');
    setNewPass('');
  };

  const handleSelectPlan = async (planId) => {
    if (planId === resPlan) return;
    if (!confirm(`${planId} planına geçmek istediğinize emin misiniz?`)) return;

    try {
      if (profileId) {
        const res = await fetch(`${API_BASE}/restaurant-profile/${profileId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active_plan: planId })
        });
        if (res.ok) {
          alert(`Planınız başarıyla ${planId} olarak değiştirildi!`);
          fetchRestaurantProfile();
          if (parentFetchProfile) {
            parentFetchProfile();
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
      
      {/* Sidebar Sub Tabs */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-muted)' }}>Ayarlar</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className={`btn ${activeSubTab === 'restaurant' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px', fontSize: '13px' }}
            onClick={() => setActiveSubTab('restaurant')}
          >
            🏢 Restoran Bilgileri
          </button>
          <button 
            className={`btn ${activeSubTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px', fontSize: '13px' }}
            onClick={() => setActiveSubTab('profile')}
          >
            👤 Profil & Şifre
          </button>
          <button 
            className={`btn ${activeSubTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px', fontSize: '13px' }}
            onClick={() => setActiveSubTab('plans')}
          >
            🚀 Abonelik Planları
          </button>
          <button 
            className={`btn ${activeSubTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px', fontSize: '13px' }}
            onClick={() => setActiveSubTab('whatsapp')}
          >
            💬 WhatsApp API Ayarları
          </button>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="card">
        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            {/* Restaurant Profile Form */}
            {activeSubTab === 'restaurant' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Restoran Kimliği & Ayarları</h3>
                <form onSubmit={handleSaveRestaurant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Restoran Adı *</label>
                    <input type="text" className="form-control" value={resName} onChange={(e) => setResName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Telefon Numarası</label>
                    <input type="text" className="form-control" value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Çalışma Saatleri</label>
                    <input type="text" className="form-control" value={resHours} onChange={(e) => setResHours(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Restoran Adresi</label>
                    <textarea className="form-control" rows="3" value={resAddress} onChange={(e) => setResAddress(e.target.value)}></textarea>
                  </div>
                  <div className="form-group">
                    <label>Vergi Dairesi</label>
                    <input type="text" className="form-control" value={resTaxOffice} onChange={(e) => setResTaxOffice(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Vergi Numarası</label>
                    <input type="text" className="form-control" value={resTaxNumber} onChange={(e) => setResTaxNumber(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                    <button type="submit" className="btn btn-primary">Değişiklikleri Kaydet</button>
                  </div>
                </form>
              </div>
            )}

            {/* Profile & Security Settings */}
            {activeSubTab === 'profile' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Profil & Güvenlik Ayarları</h3>
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                  <div className="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>E-posta Adresi</label>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <hr style={{ borderColor: 'var(--panel-border)', margin: '12px 0' }} />
                  <div className="form-group">
                    <label>Mevcut Şifre</label>
                    <input type="password" placeholder="••••••••" className="form-control" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Yeni Şifre</label>
                    <input type="password" placeholder="Yeni şifrenizi girin" className="form-control" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: '8px' }}>Profili Güncelle</button>
                </form>
              </div>
            )}

            {/* Subscription Plans Section */}
            {activeSubTab === 'plans' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>SaaS Üyelik Planları</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Restoranınız büyüdükçe planınızı yükseltin.</p>
                  </div>
                  <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Award size={14} /> Aktif Plan: {resPlan}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  {PLANS.map(plan => {
                    const isActive = resPlan === plan.id;
                    return (
                      <div 
                        key={plan.id} 
                        className={`price-card ${isActive ? 'popular' : ''}`}
                        style={{ 
                          border: isActive ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                          background: isActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.01)',
                          padding: '24px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          position: 'relative'
                        }}
                      >
                        {isActive && (
                          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                            Kullanımda
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{plan.name}</h4>
                          <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '12px', color: 'var(--success)' }}>{plan.price} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ Ay</span></div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{plan.desc}</p>
                        </div>

                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-main)', padding: 0 }}>
                          {plan.features.map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Check size={14} style={{ color: 'var(--success)' }} /> {f}
                            </li>
                          ))}
                          {plan.disabledFeatures?.map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span> {f}
                            </li>
                          ))}
                        </ul>

                        <button 
                          onClick={() => handleSelectPlan(plan.id)}
                          className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ width: '100%', marginTop: 'auto', padding: '10px' }}
                          disabled={isActive}
                        >
                          {isActive ? 'Aktif Plan' : 'Planı Değiştir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WhatsApp API Settings */}
            {activeSubTab === 'whatsapp' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#25d366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} /> WhatsApp API Entegrasyon Ayarları
                </h3>
                
                {loadingWa ? (
                  <div className="spinner"></div>
                ) : (
                  <form onSubmit={handleSaveWhatsAppConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-10px', marginBottom: '4px', lineHeight: '1.4' }}>
                      💡 Bu entegrasyon müşteri bildirimleri için kullanılabilir.
                    </p>

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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block' }}>Müşteri Canlı İletişim Entegrasyonu</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Müşteri ilişkilerinde canlı iletişim için bildirim altyapısını aktif eder.</span>
                      </div>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        checked={waConfig.is_live_chat_enabled || false}
                        onChange={(e) => setWaConfig({ ...waConfig, is_live_chat_enabled: e.target.checked })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block' }}>Bildirim Öncesi Admine Sor</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>İşaretli ise bildirim gitmeden onay sorulur. İşaretsiz ise onay sorulmadan (atla) otomatik gönderilir.</span>
                      </div>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        checked={waConfig.ask_admin_before_sending !== false}
                        onChange={(e) => setWaConfig({ ...waConfig, ask_admin_before_sending: e.target.checked })}
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

                    <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', background: '#25d366', borderColor: '#25d366' }}>
                      <Save size={16} /> API Entegrasyonunu Kaydet
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
