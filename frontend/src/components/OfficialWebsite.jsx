import React, { useState, useEffect } from 'react';
import { Globe, Save, HelpCircle, Monitor, ExternalLink, Calendar } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const TEMPLATES = [
  { id: 'Modern Dark', name: 'Modern Dark', bg: '#0b0c10', text: '#ffffff', accent: '#6366f1', desc: 'Vibrant neon indigo accents on sleek dark theme.' },
  { id: 'Elegant Gold', name: 'Elegant Gold', bg: '#0f0e0c', text: '#f3e5c8', accent: '#d4af37', desc: 'Luxury style with golden details and serif font headings.' },
  { id: 'Cozy Retro', name: 'Cozy Retro', bg: '#f4ede4', text: '#2c221e', accent: '#d96a3b', desc: 'Warm organic cream backgrounds with vintage coral touch.' },
  { id: 'Minimal Light', name: 'Minimal Light', bg: '#ffffff', text: '#111827', accent: '#10b981', desc: 'Clean high-contrast grid layouts with emerald accents.' }
];

export default function OfficialWebsite() {
  const [profileId, setProfileId] = useState(null);
  const [domain, setDomain] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Modern Dark');
  const [enableReservation, setEnableReservation] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/restaurant-profile/`);
      const data = await res.json();
      if (data && data.length > 0) {
        const prof = data[0];
        setProfileId(prof.id);
        setDomain(prof.website_custom_domain || '');
        setAboutText(prof.website_about_text || '');
        setInstagram(prof.website_instagram || '');
        setFacebook(prof.website_facebook || '');
        setSelectedTemplate(prof.website_template || 'Modern Dark');
        setEnableReservation(prof.website_enable_reservation !== false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      website_custom_domain: domain,
      website_about_text: aboutText,
      website_instagram: instagram,
      website_facebook: facebook,
      website_template: selectedTemplate,
      website_enable_reservation: enableReservation
    };

    try {
      if (profileId) {
        const res = await fetch(`${API_BASE}/restaurant-profile/${profileId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert('Tanıtım web sitesi ayarları başarıyla güncellendi!');
          fetchProfile();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get current template specs for desktop preview
  const currentTpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '24px' }}>
      
      {/* Configuration Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} /> Tanıtım Web Sitesi Oluşturucu
          </h3>

          {loading ? (
            <div className="spinner"></div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Domain setting */}
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

              {/* DNS settings help */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--panel-border)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>DNS Kurulum Bilgisi</span>
                Kendi alan adınızı yönlendirmek için DNS yönetim panelinizde şu kayıtları oluşturun:<br />
                • <strong>A Record</strong>: `@` ➜ `76.76.21.21`<br />
                • <strong>CNAME Record</strong>: `www` ➜ `domains.bidolupos.com`
              </div>

              {/* About Us bio */}
              <div className="form-group">
                <label>Hakkımızda / Hikayemiz Bölümü</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={aboutText} 
                  onChange={(e) => setAboutText(e.target.value)} 
                  placeholder="Restoranınızın kuruluşu, mutfak kültürü ve vizyonu hakkında bilgi yazın..."
                  required
                ></textarea>
              </div>

              {/* Social handles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Instagram Kullanıcı Adı</label>
                  <input type="text" className="form-control" placeholder="örn: bidolu.kebap" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Facebook Sayfası</label>
                  <input type="text" className="form-control" placeholder="örn: bidolu.kebap" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                </div>
              </div>

              {/* Reservation settings */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                <div>
                  <strong style={{ fontSize: '14px', display: 'block' }}>Müşteri Rezervasyonu</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Müşteriler web sitenizden online masa rezervasyonu yapabilir.</span>
                </div>
                <input 
                  type="checkbox" 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  checked={enableReservation}
                  onChange={(e) => setEnableReservation(e.target.checked)}
                />
              </div>

              {/* Template picker */}
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Web Tasarım Teması</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {TEMPLATES.map(tpl => (
                    <div 
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      style={{ 
                        padding: '12px', 
                        borderRadius: '10px', 
                        border: '1px solid',
                        borderColor: selectedTemplate === tpl.id ? 'var(--primary)' : 'var(--panel-border)',
                        background: selectedTemplate === tpl.id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '13px' }}>
                        <span>{tpl.name}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: tpl.bg, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: tpl.accent }} />
                        </div>
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{tpl.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                <Save size={16} /> Web Sitesini Canlıya Al
              </button>

            </form>
          )}
        </div>
      </div>

      {/* Desktop Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--panel-border)', borderRadius: '16px' }}>
          
          <div style={{ background: 'var(--bg-darker)', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 30px', borderRadius: '6px', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {domain || 'www.restoraniniz.com'} <ExternalLink size={10} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'center' }}><Monitor size={12} /> PC Görünümü</span>
          </div>

          {/* Website Canvas mock */}
          <div style={{ background: currentTpl.bg, color: currentTpl.text, minHeight: '380px', fontFamily: selectedTemplate === 'Elegant Gold' ? 'serif' : 'sans-serif', transition: 'all 0.3s ease' }}>
            
            {/* Nav Header */}
            <header style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${currentTpl.text}10` }}>
              <span style={{ fontWeight: '800', fontSize: '15px', color: currentTpl.accent }}>Bidolu Restoran</span>
              <nav style={{ display: 'flex', gap: '16px', fontSize: '11px', opacity: 0.8 }}>
                <span>Anasayfa</span>
                <span>Hikayemiz</span>
                <span>Menü</span>
                <span>İletişim</span>
              </nav>
            </header>

            {/* Hero banner */}
            <div style={{ padding: '40px 24px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', maxWidth: '300px', lineHeight: '1.2' }}>Eşsiz Lezzetlerin Buluşma Noktası</h1>
              <div style={{ width: '40px', height: '2px', background: currentTpl.accent }}></div>
              <p style={{ fontSize: '11px', opacity: 0.8, maxWidth: '340px' }}>Taze malzemelerle hazırlanan usta ellerden çıkan eşsiz tabaklar.</p>
              {enableReservation && (
                <button style={{ border: 'none', background: currentTpl.accent, color: selectedTemplate === 'Cozy Retro' ? '#fff' : '#000', padding: '8px 16px', fontSize: '11px', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                  <Calendar size={12} /> Masa Rezervasyonu Yap
                </button>
              )}
            </div>

            {/* About us section */}
            <div style={{ padding: '24px', background: `${currentTpl.text}03`, borderTop: `1px solid ${currentTpl.text}05`, borderBottom: `1px solid ${currentTpl.text}05` }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: currentTpl.accent, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hikayemiz</h3>
              <p style={{ fontSize: '10.5px', lineHeight: '1.6', opacity: 0.8 }}>
                {aboutText || 'Restoranınızın hikayesini sol taraftaki alandan doldurduğunuzda buradaki canlı önizlemede görüntülenecektir.'}
              </p>
            </div>

            {/* Footer mockup */}
            <footer style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', opacity: 0.6 }}>
              <span>© {new Date().getFullYear()} Restoran Web Sitesi.</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {instagram && <span>📸 @{instagram}</span>}
                {facebook && <span>👤 /{facebook}</span>}
              </div>
            </footer>

          </div>
        </div>
      </div>

    </div>
  );
}
