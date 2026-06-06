import React, { useState, useEffect } from 'react';
import { Globe, Save, Monitor, Tablet, Smartphone, ExternalLink, Calendar, Eye, Edit3, Check, AtSign, Users, Image, ToggleLeft, ToggleRight, Type, Link } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const TEMPLATES = [
  { id: 'Modern Dark', name: 'Modern Dark', bg: '#0b0c10', text: '#ffffff', accent: '#6366f1', cardBg: '#111218', desc: 'Canlı indigo vurgularıyla şık koyu tema' },
  { id: 'Elegant Gold', name: 'Elegant Gold', bg: '#0f0e0c', text: '#f3e5c8', accent: '#d4af37', cardBg: '#1a1815', desc: 'Altın detaylarla lüks serif başlık stili' },
  { id: 'Cozy Retro', name: 'Cozy Retro', bg: '#f4ede4', text: '#2c221e', accent: '#d96a3b', cardBg: '#ede5dc', desc: 'Sıcak organik krem zemin, vintage mercan dokunuşu' },
  { id: 'Minimal Light', name: 'Minimal Light', bg: '#ffffff', text: '#111827', accent: '#10b981', cardBg: '#f9fafb', desc: 'Sade yüksek kontrastlı ızgara düzeni, zümrüt vurgu' }
];

const DEVICE_CONFIGS = {
  desktop: { width: '100%', label: 'Masaüstü', icon: Monitor },
  tablet: { width: '640px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobil', icon: Smartphone }
};

function WebsitePreview({ tpl, domain, aboutText, instagram, facebook, enableReservation, bannerText, resName, device }) {
  const isLight = tpl.bg === '#ffffff' || tpl.bg === '#f4ede4';
  
  return (
    <div style={{
      background: tpl.bg,
      color: tpl.text,
      width: '100%',
      minHeight: '420px',
      fontFamily: tpl.id === 'Elegant Gold' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, sans-serif',
      transition: 'all 0.3s ease',
      overflow: 'hidden'
    }}>
      {/* Nav */}
      <header style={{
        padding: device === 'mobile' ? '12px 16px' : '14px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`
      }}>
        <span style={{ fontWeight: '800', fontSize: device === 'mobile' ? '13px' : '15px', color: tpl.accent }}>
          {resName || 'Restoran Adı'}
        </span>
        {device !== 'mobile' && (
          <nav style={{ display: 'flex', gap: '16px', fontSize: '11px', opacity: 0.75 }}>
            <span>Anasayfa</span>
            <span>Hikayemiz</span>
            <span>Menü</span>
            <span>İletişim</span>
          </nav>
        )}
      </header>

      {/* Hero */}
      <div style={{
        padding: device === 'mobile' ? '28px 16px' : '36px 28px 28px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        background: `linear-gradient(to bottom, ${tpl.accent}10, transparent)`
      }}>
        <h1 style={{
          fontSize: device === 'mobile' ? '18px' : '22px',
          fontWeight: '800',
          maxWidth: '320px',
          lineHeight: '1.25',
          margin: 0
        }}>
          {bannerText || 'Eşsiz Lezzetlerin Buluşma Noktası'}
        </h1>
        <div style={{ width: '36px', height: '2px', background: tpl.accent, borderRadius: '2px' }} />
        <p style={{ fontSize: '11px', opacity: 0.75, maxWidth: '300px', lineHeight: '1.6', margin: 0 }}>
          Taze malzemelerle hazırlanan usta ellerden çıkan eşsiz tabaklar.
        </p>
        {enableReservation && (
          <button style={{
            border: 'none',
            background: tpl.accent,
            color: isLight ? '#fff' : '#000',
            padding: '8px 18px',
            fontSize: '11px',
            borderRadius: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            gap: '5px',
            alignItems: 'center',
            marginTop: '6px'
          }}>
            <Calendar size={11} /> Masa Rezervasyonu Yap
          </button>
        )}
      </div>

      {/* About */}
      <div style={{
        padding: device === 'mobile' ? '16px' : '20px 28px',
        background: `${isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'}`,
        borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'}`,
        borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'}`
      }}>
        <h3 style={{ fontSize: '11px', fontWeight: '700', color: tpl.accent, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Hikayemiz
        </h3>
        <p style={{ fontSize: '10.5px', lineHeight: '1.65', opacity: 0.8, margin: 0 }}>
          {aboutText || 'Sol taraftan "Hakkımızda" alanını doldurunca buraya yansıyacaktır...'}
        </p>
      </div>

      {/* Menu snippet cards */}
      <div style={{ padding: device === 'mobile' ? '16px' : '20px 28px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: '700', color: tpl.accent, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Öne Çıkan Lezzetler
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: device === 'mobile' ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
          {['Bidolu Kebap', 'Lahmacun', 'Patlıcan Salatası'].map((item, i) => (
            <div key={i} style={{
              background: tpl.cardBg,
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ width: '100%', height: '36px', background: `${tpl.accent}20`, borderRadius: '4px' }} />
              <span style={{ fontSize: '10px', fontWeight: '600' }}>{item}</span>
              <span style={{ fontSize: '9px', color: tpl.accent, fontWeight: '700' }}>89 ₺</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: device === 'mobile' ? '12px 16px' : '14px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '9.5px',
        opacity: 0.5,
        borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'}`
      }}>
        <span>© {new Date().getFullYear()} {resName || 'Restoran'}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {instagram && <span>📸 @{instagram}</span>}
          {facebook && <span>👤 /{facebook}</span>}
        </div>
      </footer>
    </div>
  );
}

export default function OfficialWebsite() {
  const [profileId, setProfileId] = useState(null);
  const [resName, setResName] = useState('');
  const [domain, setDomain] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Modern Dark');
  const [enableReservation, setEnableReservation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [activeSection, setActiveSection] = useState('content'); // 'content' | 'design' | 'settings'

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/restaurant-profile/`);
      const data = await res.json();
      if (data && data.length > 0) {
        const prof = data[0];
        setProfileId(prof.id);
        setResName(prof.name || '');
        setDomain(prof.website_custom_domain || '');
        setBannerText(prof.website_banner_text || '');
        setAboutText(prof.website_about_text || '');
        setInstagram(prof.website_instagram || '');
        setFacebook(prof.website_facebook || '');
        setSelectedTemplate(prof.website_template || 'Modern Dark');
        setEnableReservation(prof.website_enable_reservation !== false);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (profileId) {
        const res = await fetch(`${API_BASE}/restaurant-profile/${profileId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website_custom_domain: domain,
            website_banner_text: bannerText,
            website_about_text: aboutText,
            website_instagram: instagram,
            website_facebook: facebook,
            website_template: selectedTemplate,
            website_enable_reservation: enableReservation
          })
        });
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      }
    } catch (err) { console.error(err); } 
    finally { setSaving(false); }
  };

  const currentTpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  const sectionBtn = (key, label, icon) => {
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={() => setActiveSection(key)}
        style={{
          padding: '7px 14px',
          fontSize: '12px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '600',
          background: activeSection === key ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
          color: activeSection === key ? '#fff' : 'var(--text-muted)',
          transition: 'all 0.2s'
        }}
      >
        <Icon size={13} /> {label}
      </button>
    );
  };

  if (loading) return <div className="spinner" style={{ margin: '60px auto' }} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>

      {/* ─── LEFT PANEL: Editor ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          {sectionBtn('content', 'İçerik', Type)}
          {sectionBtn('design', 'Tasarım', Image)}
          {sectionBtn('settings', 'Ayarlar', Link)}
        </div>

        <form onSubmit={handleSave}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── CONTENT SECTION ── */}
            {activeSection === 'content' && (
              <>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Type size={16} style={{ color: 'var(--primary)' }} /> İçerik Düzenleyici
                </h3>

                <div className="form-group">
                  <label>Hero Banner Yazısı</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder="Eşsiz Lezzetlerin Buluşma Noktası"
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Ana sayfanın üst kısmında büyük yazı olarak görünür
                  </small>
                </div>

                <div className="form-group">
                  <label>Hakkımızda / Hikayemiz</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Restoranınızın kuruluşu, mutfak kültürü ve vizyonu..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label><AtSign size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Instagram</label>
                    <input type="text" className="form-control" placeholder="bidolu.kebap" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label><AtSign size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Facebook</label>
                    <input type="text" className="form-control" placeholder="bidolu.kebap" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block' }}>Online Rezervasyon Butonu</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Müşteriler web sitenizden masa rezervasyonu yapabilir</span>
                  </div>
                  <button type="button" onClick={() => setEnableReservation(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: enableReservation ? 'var(--success)' : 'var(--text-muted)' }}>
                    {enableReservation ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </>
            )}

            {/* ── DESIGN SECTION ── */}
            {activeSection === 'design' && (
              <>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Image size={16} style={{ color: 'var(--primary)' }} /> Tema & Tasarım
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: `2px solid ${selectedTemplate === tpl.id ? 'var(--primary)' : 'var(--panel-border)'}`,
                        background: selectedTemplate === tpl.id ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      {/* Color dots preview */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: tpl.bg, border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '14px', height: '3px', borderRadius: '2px', background: tpl.accent }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px' }}>{tpl.name}</strong>
                          {selectedTemplate === tpl.id && <Check size={14} style={{ color: 'var(--primary)' }} />}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{tpl.desc}</p>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {[tpl.bg, tpl.accent, tpl.text].map((c, i) => (
                            <span key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── SETTINGS SECTION ── */}
            {activeSection === 'settings' && (
              <>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link size={16} style={{ color: 'var(--primary)' }} /> Alan Adı & Yayın Ayarları
                </h3>

                <div className="form-group">
                  <label>Özel Alan Adı (Custom Domain)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="www.restoraniniz.com"
                  />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--panel-border)', borderRadius: '10px', padding: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>🌐 DNS Kurulum Rehberi</span>
                  Kendi alan adınızı yönlendirmek için DNS yönetim panelinizde şu kayıtları oluşturun:<br />
                  • <strong>A Record</strong>: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>@</code> ➜ <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>76.76.21.21</code><br />
                  • <strong>CNAME Record</strong>: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>www</code> ➜ <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>domains.bidolupos.com</code>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', background: saved ? 'var(--success)' : undefined, borderColor: saved ? 'var(--success)' : undefined, transition: 'all 0.3s' }}
            >
              {saved ? <><Check size={16} /> Kaydedildi!</> : saving ? 'Kaydediliyor...' : <><Save size={16} /> Değişiklikleri Kaydet</>}
            </button>
          </div>
        </form>
      </div>

      {/* ─── RIGHT PANEL: Live Preview ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '24px' }}>

        {/* Device switcher toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Canlı Önizleme</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: '10px' }}>Anlık güncelleniyor</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
            {Object.entries(DEVICE_CONFIGS).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreviewDevice(key)}
                  title={cfg.label}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: previewDevice === key ? 'var(--primary)' : 'transparent',
                    color: previewDevice === key ? '#fff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.15s'
                  }}
                >
                  <Icon size={13} /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Browser chrome mockup */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--panel-border)', background: 'var(--bg-darker)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          {/* Titlebar */}
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ff5f56' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#27c93f' }} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 20px', borderRadius: '6px', fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', flex: 1, maxWidth: '260px', margin: '0 16px', justifyContent: 'center' }}>
              🔒 {domain || 'www.restoraniniz.com'} <ExternalLink size={9} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(() => { const Icon = DEVICE_CONFIGS[previewDevice].icon; return <Icon size={11} />; })()}
              {DEVICE_CONFIGS[previewDevice].label}
            </span>
          </div>

          {/* Preview viewport */}
          <div style={{ overflowX: 'auto', display: 'flex', justifyContent: previewDevice !== 'desktop' ? 'center' : 'stretch', background: previewDevice !== 'desktop' ? 'rgba(0,0,0,0.3)' : 'transparent', padding: previewDevice !== 'desktop' ? '16px' : '0' }}>
            <div style={{
              width: DEVICE_CONFIGS[previewDevice].width,
              minWidth: DEVICE_CONFIGS[previewDevice].width,
              maxWidth: DEVICE_CONFIGS[previewDevice].width,
              transition: 'all 0.35s ease',
              borderRadius: previewDevice !== 'desktop' ? '8px' : '0',
              overflow: 'hidden',
              boxShadow: previewDevice !== 'desktop' ? '0 4px 20px rgba(0,0,0,0.5)' : 'none'
            }}>
              <WebsitePreview
                tpl={currentTpl}
                domain={domain}
                aboutText={aboutText}
                instagram={instagram}
                facebook={facebook}
                enableReservation={enableReservation}
                bannerText={bannerText}
                resName={resName}
                device={previewDevice}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
