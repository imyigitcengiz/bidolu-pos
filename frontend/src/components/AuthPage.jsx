import React, { useState } from 'react';
import { User, Lock, Mail, Phone, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // First-time setup
  const [setupMode, setSetupMode] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [setupInfo, setSetupInfo] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş başarısız.');
        return;
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/seed-super-admin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kurulum başarısız.');
        return;
      }

      setSetupDone(true);
      setSetupInfo(data);
      setUsername('admin');
      setPassword('admin123');
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
    }}>
      {/* Decorative shapes */}
      <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-150px', left: '-150px', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#fff', fontWeight: '800', fontSize: '24px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          }}>B</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Bidolu POS
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Restoran Yönetim Sistemi
          </p>
        </div>

        {/* Setup Mode */}
        {setupMode && !setupDone && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
                ⚡ <strong>İlk Kurulum</strong> — Sistemde hiç kullanıcı yok. Varsayılan süper yönetici hesabı oluşturulacak.
              </p>
            </div>
            <button
              onClick={handleSetup}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Oluşturuluyor...' : '🚀 Süper Yönetici Oluştur'}
            </button>
            <button
              onClick={() => setSetupMode(false)}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer' }}
            >
              ← Giriş ekranına dön
            </button>
          </div>
        )}

        {setupDone && setupInfo && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#065f46', margin: 0, lineHeight: '1.6' }}>
                ✅ <strong>Hesap oluşturuldu!</strong><br />
                Kullanıcı adı: <code style={{ background: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>admin</code><br />
                Şifre: <code style={{ background: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>admin123</code><br />
                <span style={{ fontSize: '11px', color: '#047857' }}>⚠️ Güvenlik için şifrenizi giriş yaptıktan sonra değiştirin.</span>
              </p>
            </div>
            <button
              onClick={() => { setSetupMode(false); setSetupDone(false); }}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: '#10b981', color: '#fff', fontWeight: '700', fontSize: '14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <LogIn size={18} /> Giriş Yap
            </button>
          </div>
        )}

        {/* Login Form */}
        {!setupMode && (
          <form onSubmit={handleLogin}>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px',
                padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#991b1b',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Kullanıcı Adı
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınız"
                  required
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#0f172a',
                    background: '#f8fafc', outline: 'none', transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Şifre
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  required
                  style={{
                    width: '100%', padding: '12px 44px 12px 40px', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#0f172a',
                    background: '#f8fafc', outline: 'none', transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span>Giriş yapılıyor...</span>
              ) : (
                <>
                  <LogIn size={18} /> Giriş Yap
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSetupMode(true)}
                style={{
                  background: 'none', border: 'none', color: '#6366f1', fontSize: '12px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                  margin: '0 auto',
                }}
              >
                İlk kez mi kurulum yapıyorsunuz? <ArrowRight size={12} />
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
            © 2024 Bidolu POS • Tüm hakları saklıdır
          </p>
        </div>
      </div>
    </div>
  );
}
