import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Tables from './components/Tables';
import OrderTaking from './components/OrderTaking';
import Kitchen from './components/Kitchen';
import MenuManagement from './components/MenuManagement';
import OrderPanel from './components/OrderPanel';
import CashRegister from './components/CashRegister';
import RecipeInventory from './components/RecipeInventory';
import Personnel from './components/Personnel';
import Expenses from './components/Expenses';
import Couriers from './components/Couriers';
import Reports from './components/Reports';
import SettingsComponent from './components/Settings';
import WebsiteBuilder from './components/WebsiteBuilder';
import OfficialWebsite from './components/OfficialWebsite';
import Extensions from './components/Extensions';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import SuperAdminPanel from './components/SuperAdminPanel';
import { 
  LayoutGrid, Coffee, ChefHat, Settings, Calendar, Bell, ArrowLeft, 
  ShoppingBag, Layers, CreditCard, Users, DollarSign, Truck, PieChart, BookOpen, Globe, QrCode, Puzzle, MessageSquare,
  Contact, Lock, Menu, X, LogOut, UserCircle, ShieldAlert
} from 'lucide-react';

const planLevels = {
  'Starter': 1,
  'Growth': 2,
  'Enterprise': 3
};

const hasRequiredPlan = (currentPlan, requiredPlan) => {
  const current = planLevels[currentPlan] || 1;
  const required = planLevels[requiredPlan] || 1;
  return current >= required;
};

const UpgradePage = ({ requiredPlan, featureName, currentPlan, setCurrentTab }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
      borderRadius: '16px',
      border: '1px solid var(--panel-border)',
      maxWidth: '640px',
      margin: '40px auto'
    }}>
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <Lock size={28} />
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>{featureName} Özelliği Planınıza Dahil Değil</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '480px', marginBottom: '20px' }}>
        Bu özelliği kullanabilmek için aktif planınızın en az <strong>{requiredPlan === 'Enterprise' ? 'Kurumsal (Enterprise)' : 'Büyüyen (Growth)'}</strong> planı olması gerekmektedir. Mevcut planınız: <strong>{currentPlan}</strong>.
      </p>
      
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button 
          onClick={() => {
            localStorage.setItem('settingsSubTab', 'plans');
            setCurrentTab('settings');
          }}
          className="btn btn-primary"
          style={{ padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: requiredPlan === 'Enterprise' ? '#f85f34' : 'var(--primary)', borderColor: requiredPlan === 'Enterprise' ? '#f85f34' : 'var(--primary)' }}
        >
          Planları İncele & Yükselt
        </button>
      </div>
    </div>
  );
};

function App() {
  // URL → tab mapping
  const getTabFromPath = () => {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!path || path === '/') return null; // landing page
    const validTabs = ['dashboard','tables','order-taking','order-panel','kitchen','menu',
      'recipe-stok','cash-register','personnel','crm','expenses','couriers','reports',
      'settings','qr-menu','official-website','extensions','profile','super-admin'];
    return validTabs.includes(path) ? path : null;
  };

  const [isLanding, setIsLanding] = useState(() => {
    const pathTab = getTabFromPath();
    if (pathTab) return false; // URL has a valid tab path → skip landing
    const saved = localStorage.getItem('isLanding');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentTab, setCurrentTab] = useState(() => {
    const pathTab = getTabFromPath();
    return pathTab || localStorage.getItem('currentTab') || 'dashboard';
  });
  const [selectedTable, setSelectedTable] = useState(() => {
    const saved = localStorage.getItem('selectedTable');
    return saved !== null ? JSON.parse(saved) : null;
  });
  const [activeOrder, setActiveOrder] = useState(() => {
    const saved = localStorage.getItem('activeOrder');
    return saved !== null ? JSON.parse(saved) : null;
  });

  const [extensionsSubView, setExtensionsSubView] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Auth state ──
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Close mobile menu when tab changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentTab]);

  // ── Validate token on app load ──
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) { setAuthLoading(false); return; }
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL || '')}/api/auth/me/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setAuthToken(token);
        } else {
          // Token invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setAuthToken(null);
          setCurrentUser(null);
        }
      } catch {
        // Network error — keep existing state
      }
      setAuthLoading(false);
    };
    validateToken();
  }, []);

  const handleLogin = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    // Call logout API
    fetch(`${(import.meta.env.VITE_API_URL || '')}/api/auth/logout/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${authToken}` },
    }).catch(() => {});
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  // ── Keyboard Shortcuts & Command Palette ──
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef(null);

  const searchItems = [
    { tab: 'dashboard', label: 'Yönetim Paneli', desc: 'İşletme performans özeti', icon: '📊', keywords: 'dashboard ana sayfa panel yönetim' },
    { tab: 'tables', label: 'Masa Yönetimi', desc: 'Masaların durumunu takip edin', icon: '🍽️', keywords: 'masa table oturma' },
    { tab: 'order-taking', label: 'Sipariş Alma', desc: 'Masa siparişi girin', icon: '📝', keywords: 'sipariş order alma girme' },
    { tab: 'order-panel', label: 'Sipariş Paneli', desc: 'Entegrasyon siparişleri', icon: '📦', keywords: 'sipariş panel entegrasyon yemeksepeti getir' },
    { tab: 'kitchen', label: 'Mutfak Ekranı', desc: 'Hazırlanacak siparişler', icon: '👨‍🍳', keywords: 'mutfak kitchen hazırlık' },
    { tab: 'menu', label: 'Menü Yönetimi', desc: 'Kategori ve ürün yönetimi', icon: '📋', keywords: 'menü menu yemek ürün kategori' },
    { tab: 'recipe-stok', label: 'Reçete & Stok', desc: 'Malzeme ve stok takibi', icon: '📦', keywords: 'reçete stok malzeme envanter inventory' },
    { tab: 'cash-register', label: 'Kasa İşlemleri', desc: 'Nakit giriş-çıkışları', icon: '💰', keywords: 'kasa nakit ödeme para cash' },
    { tab: 'personnel', label: 'Personel', desc: 'Çalışan ve rol yönetimi', icon: '👥', keywords: 'personel çalışan garson staff' },
    { tab: 'crm', label: 'Müşteri CRM', desc: 'Müşteri kayıtları ve iletişim', icon: '📇', keywords: 'müşteri crm rehber customer iletişim' },
    { tab: 'expenses', label: 'Gider Takibi', desc: 'Harcama ve fatura yönetimi', icon: '💸', keywords: 'gider harcama fatura expense masraf' },
    { tab: 'couriers', label: 'Kurye Takibi', desc: 'Teslimat ve avans yönetimi', icon: '🛵', keywords: 'kurye teslimat delivery paket' },
    { tab: 'reports', label: 'Raporlar', desc: 'Ciro ve kâr-zarar analizi', icon: '📈', keywords: 'rapor analiz ciro kâr zarar report' },
    { tab: 'settings', label: 'Genel Ayarlar', desc: 'Profil ve plan ayarları', icon: '⚙️', keywords: 'ayar settings profil plan' },
    { tab: 'qr-menu', label: 'QR Menü', desc: 'Masadan QR sipariş sistemi', icon: '📱', keywords: 'qr menu karekod sipariş' },
    { tab: 'official-website', label: 'Web Sitesi', desc: 'Kurumsal tanıtım sitesi', icon: '🌐', keywords: 'web site website internet tanıtım' },
    { tab: 'extensions', label: 'Eklentiler', desc: 'WhatsApp API ve pazaryeri', icon: '🧩', keywords: 'eklenti extension whatsapp marketplace' },
    { tab: 'profile', label: 'Profilim', desc: 'Kişisel bilgiler ve şifre', icon: '👤', keywords: 'profil hesap şifre email' },
    { tab: 'super-admin', label: 'Sistem Yönetimi', desc: 'Kullanıcı ve rol yönetimi', icon: '🛡️', keywords: 'admin sistem kullanıcı rol yetki', role: 'super_admin' },
    { action: 'logout', label: 'Çıkış Yap', desc: 'Oturumu sonlandır', icon: '🚪', keywords: 'çıkış logout oturum' },
    { action: 'landing', label: 'Tanıtım Sayfası', desc: 'Ana tanıtım sayfasına dön', icon: '🏠', keywords: 'tanıtım landing ana sayfa' },
  ];

  const filteredSearchItems = searchQuery.trim()
    ? searchItems.filter(item => {
        if (item.role && currentUser?.role !== item.role) return false;
        const q = searchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q)
          || item.desc.toLowerCase().includes(q)
          || item.keywords.toLowerCase().includes(q);
      })
    : searchItems.filter(item => !(item.role && currentUser?.role !== item.role));

  const handleSearchSelect = (item) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchIndex(0);
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.action === 'landing') {
      setIsLanding(true);
    } else if (item.tab) {
      setCurrentTab(item.tab);
      setSelectedTable(null);
    }
  };

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Reset index when query changes
  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle search modal keys first
      if (showSearch) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSearch(false);
          setSearchQuery('');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchIndex(i => Math.min(i + 1, filteredSearchItems.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchIndex(i => Math.max(i - 1, 0));
          return;
        }
        if (e.key === 'Enter' && filteredSearchItems.length > 0) {
          e.preventDefault();
          handleSearchSelect(filteredSearchItems[searchIndex]);
          return;
        }
        return; // Don't process other shortcuts while search is open
      }

      // Don't trigger shortcuts when typing in inputs
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      // Don't trigger on landing/auth pages
      if (isLanding || !authToken) return;

      // / key → open search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // ? key → toggle shortcut help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(v => !v);
        return;
      }

      // Escape → close shortcut help / close mobile menu
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (mobileMenuOpen) { setMobileMenuOpen(false); return; }
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl + number → main tabs
      if (ctrl && !e.shiftKey) {
        const numMap = {
          '1': 'dashboard',
          '2': 'tables',
          '3': 'kitchen',
          '4': 'menu',
          '5': 'order-panel',
          '6': 'cash-register',
          '7': 'reports',
          '8': 'settings',
          '9': 'profile',
        };
        if (numMap[e.key]) {
          e.preventDefault();
          setCurrentTab(numMap[e.key]);
          setSelectedTable(null);
          return;
        }
      }

      // Alt + letter → quick jump
      if (e.altKey && !ctrl) {
        const altMap = {
          'd': 'dashboard',
          'm': 'menu',
          't': 'tables',
          'k': 'kitchen',
          'r': 'reports',
          'p': 'personnel',
          'e': 'expenses',
          'c': 'couriers',
          'g': 'settings',
          's': 'recipe-stok',
          'w': 'official-website',
          'q': 'qr-menu',
          'x': 'extensions',
          'a': 'super-admin',
          'f': 'profile',
        };
        if (altMap[e.key.toLowerCase()]) {
          e.preventDefault();
          setCurrentTab(altMap[e.key.toLowerCase()]);
          setSelectedTable(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLanding, authToken, showShortcuts, showSearch, mobileMenuOpen, filteredSearchItems, searchIndex]);


  // ── Notification & Low-stock state ──
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const lastOrderIdRef = useRef(null);
  const notifPanelRef = useRef(null);

  // Play a soft ding using Web Audio API
  const playDing = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) { /* silent fail */ }
  }, []);

  // Poll for new active orders every 8 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL || '')}/api/orders/?active=true`);
        const data = await res.json();
        if (!Array.isArray(data)) return;
        
        const activeOrders = data.filter(o => o.status === 'preparing' || o.status === 'ready');
        const latestId = activeOrders.length > 0 ? activeOrders[0].id : null;
        
        if (lastOrderIdRef.current !== null && latestId && latestId > lastOrderIdRef.current) {
          // New order arrived!
          playDing();
          const newOrder = activeOrders[0];
          setNotifications(prev => [{
            id: newOrder.id,
            title: `Yeni Sipariş — ${newOrder.table_name}`,
            body: `${newOrder.items?.length || 0} kalem ürün • ${parseFloat(newOrder.total_amount).toLocaleString('tr-TR')} ₺`,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'order'
          }, ...prev].slice(0, 20));
          setUnreadCount(c => c + 1);
        }
        lastOrderIdRef.current = latestId || lastOrderIdRef.current;
      } catch (e) { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [playDing]);

  // Poll low-stock every 30 seconds
  useEffect(() => {
    const pollStock = async () => {
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL || '')}/api/low-stock/`);
        const data = await res.json();
        setLowStockCount(data.count || 0);
      } catch (e) { /* silent */ }
    };
    pollStock();
    const interval = setInterval(pollStock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const [restaurantProfile, setRestaurantProfile] = useState({
    active_plan: 'Growth',
    ext_qr_menu_enabled: true,
    ext_official_website_enabled: true,
    ext_crm_enabled: true,
    ext_whatsapp_enabled: false,
    ext_live_courier_enabled: false
  });

  const fetchRestaurantProfile = async () => {
    try {
      const res = await fetch(`${(import.meta.env.VITE_API_URL || '')}/api/restaurant-profile/`);
      const data = await res.json();
      if (data && data.length > 0) {
        setRestaurantProfile(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchRestaurantProfile();
  }, []);

  React.useEffect(() => {
    localStorage.setItem('isLanding', JSON.stringify(isLanding));
    if (isLanding) {
      window.history.replaceState(null, '', '/');
    }
  }, [isLanding]);

  // Sync URL when tab changes
  React.useEffect(() => {
    localStorage.setItem('currentTab', currentTab);
    if (!isLanding) {
      const newPath = `/${currentTab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ tab: currentTab }, '', newPath);
      }
    }
  }, [currentTab, isLanding]);

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = (e) => {
      const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
      if (!path || path === '/') {
        setIsLanding(true);
      } else {
        setIsLanding(false);
        setCurrentTab(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    if (selectedTable) {
      localStorage.setItem('selectedTable', JSON.stringify(selectedTable));
    } else {
      localStorage.removeItem('selectedTable');
    }
  }, [selectedTable]);

  React.useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('activeOrder', JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem('activeOrder');
    }
  }, [activeOrder]);

  const handleSelectTable = (table, order) => {
    setSelectedTable(table);
    setActiveOrder(order);
    setCurrentTab('order-taking');
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
    setActiveOrder(null);
    setCurrentTab('tables');
  };

  const renderContent = () => {
    const activePlan = restaurantProfile?.active_plan || 'Growth';

    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'tables':
        return <Tables onSelectTable={handleSelectTable} />;
      case 'order-taking':
        return (
          <OrderTaking 
            table={selectedTable} 
            activeOrder={activeOrder} 
            onBack={handleBackToTables} 
          />
        );
      case 'order-panel':
        return <OrderPanel />;
      case 'kitchen':
        return <Kitchen />;
      case 'menu':
        return <MenuManagement />;
      case 'recipe-stok':
        return <RecipeInventory />;
      case 'cash-register':
        return <CashRegister />;
      case 'personnel':
        return <Personnel />;
      case 'crm':
        return (
          <Extensions 
            setCurrentTab={setCurrentTab} 
            activeSubView="crm"
            setActiveSubView={() => {}}
            restaurantProfile={restaurantProfile} 
            fetchRestaurantProfile={fetchRestaurantProfile} 
            isCoreCrm={true}
          />
        );
      case 'expenses':
        return <Expenses />;
      case 'couriers':
        return <Couriers restaurantProfile={restaurantProfile} />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsComponent fetchRestaurantProfile={fetchRestaurantProfile} />;
      case 'qr-menu':
        if (!hasRequiredPlan(activePlan, 'Growth')) {
          return <UpgradePage requiredPlan="Growth" featureName="QR Menü" currentPlan={activePlan} setCurrentTab={setCurrentTab} />;
        }
        return <WebsiteBuilder />;
      case 'official-website':
        if (!hasRequiredPlan(activePlan, 'Growth')) {
          return <UpgradePage requiredPlan="Growth" featureName="Tanıtım Web Sitesi" currentPlan={activePlan} setCurrentTab={setCurrentTab} />;
        }
        return <OfficialWebsite />;
      case 'extensions':
        if (extensionsSubView === 'whatsapp' && !hasRequiredPlan(activePlan, 'Enterprise')) {
          return <UpgradePage requiredPlan="Enterprise" featureName="WhatsApp Kampanyaları" currentPlan={activePlan} setCurrentTab={setCurrentTab} />;
        }
        return (
          <Extensions 
            setCurrentTab={setCurrentTab} 
            activeSubView={extensionsSubView}
            setActiveSubView={setExtensionsSubView}
            restaurantProfile={restaurantProfile} 
            fetchRestaurantProfile={fetchRestaurantProfile} 
          />
        );
      case 'profile':
        return <ProfilePage authToken={authToken} currentUser={currentUser} onProfileUpdate={handleProfileUpdate} />;
      case 'super-admin':
        return <SuperAdminPanel authToken={authToken} />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Yönetim Paneli';
      case 'tables':
        return 'Masa Yönetimi';
      case 'order-taking':
        return 'Sipariş Ekranı';
      case 'order-panel':
        return 'Sipariş Paneli (Entegrasyonlar)';
      case 'kitchen':
        return 'Mutfak Ekranı';
      case 'menu':
        return 'Menü Yönetimi';
      case 'recipe-stok':
        return 'Reçete & Stok Yönetimi';
      case 'cash-register':
        return 'Kasa İşlemleri';
      case 'personnel':
        return 'Personel Yönetimi';
      case 'crm':
        return 'Müşteri CRM';
      case 'expenses':
        return 'Gider Takibi';
      case 'couriers':
        return 'Kurye & Paraüstü Takibi';
      case 'reports':
        return 'Raporlar';
      case 'settings':
        return 'Genel Ayarlar';
      case 'qr-menu':
        return 'QR Menü (Sipariş)';
      case 'official-website':
        return 'Tanıtım Web Sitesi';
      case 'extensions':
        return 'Eklentiler & Pazaryeri';
      case 'profile':
        return 'Profilim';
      case 'super-admin':
        return 'Sistem Yönetimi';
      default:
        return 'Bidolu POS';
    }
  };

  const getPageSubtitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'İşletmenizin performansına genel bir bakış';
      case 'tables':
        return 'Masalarınızın durumunu ve siparişlerini takip edin';
      case 'order-taking':
        return 'Masa siparişlerini girin ve hesap ödemelerini alın';
      case 'order-panel':
        return 'Yemeksepeti, Getir, Trendyol, Migros ve WebSitesi siparişleri';
      case 'kitchen':
        return 'Mutfakta hazırlanmayı bekleyen siparişlerin takibi';
      case 'menu':
        return 'Kategori ve yemek menü elemanlarını yönetin';
      case 'recipe-stok':
        return 'Malzeme stok durumları, reçeteler ve satın alma işlemleri';
      case 'cash-register':
        return 'Nakit giriş-çıkışları, tahsilatlar ve kasa bakiyeleri';
      case 'personnel':
        return 'İşletme personelleri, çalışma rolleri ve yetkiler';
      case 'crm':
        return 'Müşteri kayıtları, iletişim rehberi, sipariş geçmişleri ve CSV içe/dışa aktarım yönetimi';
      case 'expenses':
        return 'Dükkan kirası, faturalar ve diğer tüm harcamalar';
      case 'couriers':
        return 'Lokal kurye durumları, teslimat günlükleri ve paraüstü avansları';
      case 'reports':
        return 'Detaylı ciro dağılımları ve kâr-zarar analiz raporları';
      case 'settings':
        return 'Profil, restoran kimliği ve üyelik planı ayarları';
      case 'qr-menu':
        return 'Masadan QR sipariş, temalar ve karekod yönetimi';
      case 'official-website':
        return 'Müşterileriniz için kurumsal tanıtım web sitesi';
      case 'extensions':
        return 'Müşteri CRM rehberi, WhatsApp API otomasyonları ve kampanyalar';
      case 'profile':
        return 'Kişisel bilgiler, şifre değişikliği ve hesap ayarları';
      case 'super-admin':
        return 'Kullanıcı hesapları, roller ve erişim yetkileri yönetimi';
      default:
        return 'Restoran Yönetim Sistemi';
    }
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString('tr-TR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // If we are on the SaaS Landing Page
  if (isLanding) {
    return <LandingPage onLaunchApp={() => setIsLanding(false)} />;
  }

  // Auth loading screen
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Not authenticated → show AuthPage
  if (!authToken || !currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">B</div>
          <span className="logo-text">Bidolu POS</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links" style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '4px' }}>
            <li 
              className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('dashboard'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <LayoutGrid size={18} />
              <span>Yönetim Paneli</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'tables' || currentTab === 'order-taking' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('tables'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Coffee size={18} />
              <span>Masa Yönetimi</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'order-panel' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('order-panel'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <ShoppingBag size={18} />
              <span>Sipariş Paneli</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'kitchen' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('kitchen'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <ChefHat size={18} />
              <span>Mutfak Ekranı</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'menu' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('menu'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <BookOpen size={18} />
              <span>Menü Yönetimi</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'recipe-stok' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('recipe-stok'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px', position: 'relative' }}
            >
              <Layers size={18} />
              <span>Reçete & Stok</span>
              {lowStockCount > 0 && (
                <span style={{
                  position: 'absolute', top: '6px', right: '8px',
                  background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: '700',
                  borderRadius: '10px', padding: '1px 6px',
                  minWidth: '18px', textAlign: 'center'
                }}>{lowStockCount}</span>
              )}
            </li>
            <li 
              className={`nav-item ${currentTab === 'cash-register' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('cash-register'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <CreditCard size={18} />
              <span>Kasa İşlemleri</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'personnel' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('personnel'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Users size={18} />
              <span>Personeller</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'crm' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('crm'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Contact size={18} />
              <span>Müşteri CRM</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'expenses' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('expenses'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <DollarSign size={18} />
              <span>Gider Takibi</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'couriers' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('couriers'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Truck size={18} />
              <span>Kurye Takibi</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'reports' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('reports'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <PieChart size={18} />
              <span>Raporlar</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'extensions' && extensionsSubView === null ? 'active' : ''}`}
              onClick={() => { setCurrentTab('extensions'); setExtensionsSubView(null); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Puzzle size={18} />
              <span>Eklentiler</span>
            </li>
            
            {/* Indented Sub-menu for active extensions */}
            <div style={{ 
              paddingLeft: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px', 
              borderLeft: '1px solid rgba(0,0,0,0.06)', 
              marginLeft: '22px', 
              marginBottom: '10px', 
              marginTop: '2px' 
            }}>
              {restaurantProfile.ext_qr_menu_enabled && hasRequiredPlan(restaurantProfile.active_plan, 'Growth') && (
                <div 
                  className={`nav-item ${currentTab === 'qr-menu' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('qr-menu'); setSelectedTable(null); }}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <QrCode size={14} />
                  <span>QR Menü</span>
                </div>
              )}
              {restaurantProfile.ext_official_website_enabled && hasRequiredPlan(restaurantProfile.active_plan, 'Growth') && (
                <div 
                  className={`nav-item ${currentTab === 'official-website' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('official-website'); setSelectedTable(null); }}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <Globe size={14} />
                  <span>Web Sitesi</span>
                </div>
              )}
              {/* Müşteri CRM has been promoted to a core sidebar item */}
              {restaurantProfile.ext_whatsapp_enabled && hasRequiredPlan(restaurantProfile.active_plan, 'Enterprise') && (
                <div 
                  className={`nav-item ${currentTab === 'extensions' && extensionsSubView === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => { setCurrentTab('extensions'); setExtensionsSubView('whatsapp'); setSelectedTable(null); }}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp API</span>
                </div>
              )}
            </div>
            <li 
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('settings'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Settings size={18} />
              <span>Ayarlar</span>
            </li>
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* User Profile mini card */}
          <div 
            className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('profile'); setSelectedTable(null); }}
            style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer' }}
          >
            <UserCircle size={18} />
            <span>{currentUser?.first_name || currentUser?.username || 'Profil'}</span>
          </div>

          {/* Super Admin Panel — only for super_admin role */}
          {currentUser?.role === 'super_admin' && (
            <li 
              className={`nav-item ${currentTab === 'super-admin' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('super-admin'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <ShieldAlert size={18} />
              <span>Sistem Yönetimi</span>
            </li>
          )}

          <button 
            onClick={() => setIsLanding(true)} 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '8px 14px', fontSize: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '4px' }}
          >
            <ArrowLeft size={14} /> Tanıtım Sayfası
          </button>

          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', padding: '8px 14px', fontSize: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center',
              background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="header-container">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="header-title">
            <h1>{getPageTitle()}</h1>
            <p>{getPageSubtitle()}</p>
          </div>
          <div className="header-actions">
            <div className="date-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} />
              <span>{formattedDate}</span>
            </div>
            {/* Notification Bell */}
            <div ref={notifPanelRef} style={{ position: 'relative' }}>
              <div
                className="date-badge"
                style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                onClick={() => { setShowNotifPanel(v => !v); if (unreadCount > 0) markAllRead(); }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: '#ef4444', color: '#fff',
                    fontSize: '9px', fontWeight: '700',
                    borderRadius: '10px', padding: '1px 5px',
                    minWidth: '16px', textAlign: 'center',
                    lineHeight: '14px'
                  }}>{unreadCount}</span>
                )}
              </div>
              {showNotifPanel && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: '320px', background: 'var(--bg-card)',
                  border: '1px solid var(--panel-border)', borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>🔔 Bildirimler</span>
                    {notifications.length > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer' }}>Tümünü okundu işaretle</button>
                    )}
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Henüz bildirim yok
                      </div>
                    ) : notifications.map((n, i) => (
                      <div key={i} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--panel-border)',
                        background: n.read ? 'transparent' : 'rgba(99,102,241,0.04)',
                        display: 'flex', gap: '12px', alignItems: 'flex-start'
                      }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>🛒</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{n.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.body}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.time}</div>
                        </div>
                        {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', marginTop: '5px', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section>
          {renderContent()}
        </section>
      </main>

      {/* Command Palette Search */}
      {showSearch && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSearch(false); setSearchQuery(''); } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            zIndex: 10001, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid var(--panel-border)',
            overflow: 'hidden',
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', gap: '12px' }}>
              <div style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: '800', opacity: 0.6 }}>/</div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sayfa veya işlem ara..."
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: '15px', fontWeight: '500', color: 'var(--text-main)',
                  fontFamily: 'inherit',
                }}
              />
              <kbd style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)',
                borderRadius: '6px', padding: '2px 8px', fontSize: '10px', color: 'var(--text-muted)',
                fontFamily: 'monospace',
              }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}>
              {filteredSearchItems.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Sonuç bulunamadı
                </div>
              ) : filteredSearchItems.map((item, i) => (
                <div
                  key={item.tab || item.action}
                  onClick={() => handleSearchSelect(item)}
                  onMouseEnter={() => setSearchIndex(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                    background: i === searchIndex ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: i === searchIndex ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: i === searchIndex ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                  </div>
                  {i === searchIndex && (
                    <kbd style={{
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                      borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: '700',
                      fontFamily: 'monospace', color: 'var(--primary)', flexShrink: 0,
                    }}>↵</kbd>
                  )}
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', fontFamily: 'monospace' }}>↑↓</kbd> gezin
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', fontFamily: 'monospace' }}>↵</kbd> seç
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', fontFamily: 'monospace' }}>?</kbd> kısayollar
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcuts && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowShortcuts(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', width: '100%', maxWidth: '580px',
            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            border: '1px solid var(--panel-border)',
          }}>
            <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>⌨️ Klavye Kısayolları</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Hızlı gezinme için kısayolları kullanın</p>
              </div>
              <button onClick={() => setShowShortcuts(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>ESC</button>
            </div>

            <div style={{ padding: '20px 28px' }}>
              {/* Ctrl + Number shortcuts */}
              <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px', marginBottom: '10px' }}>Ctrl / ⌘ + Sayı</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '20px' }}>
                {[
                  ['1', 'Yönetim Paneli'],
                  ['2', 'Masalar'],
                  ['3', 'Mutfak'],
                  ['4', 'Menü Yönetimi'],
                  ['5', 'Sipariş Paneli'],
                  ['6', 'Kasa'],
                  ['7', 'Raporlar'],
                  ['8', 'Ayarlar'],
                  ['9', 'Profilim'],
                ].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--panel-border)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', minWidth: '20px', textAlign: 'center' }}>⌘</kbd>
                      <kbd style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--primary)', minWidth: '20px', textAlign: 'center' }}>{key}</kbd>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Alt + Letter shortcuts */}
              <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#a855f7', letterSpacing: '1px', marginBottom: '10px' }}>Alt + Harf</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '20px' }}>
                {[
                  ['D', 'Yönetim Paneli'],
                  ['T', 'Masalar'],
                  ['K', 'Mutfak'],
                  ['M', 'Menü'],
                  ['R', 'Raporlar'],
                  ['P', 'Personel'],
                  ['E', 'Giderler'],
                  ['C', 'Kuryeler'],
                  ['S', 'Reçete & Stok'],
                  ['G', 'Genel Ayarlar'],
                  ['W', 'Web Sitesi'],
                  ['Q', 'QR Menü'],
                  ['X', 'Eklentiler'],
                  ['F', 'Profil'],
                  ['A', 'Sistem Yönetimi'],
                ].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--panel-border)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', minWidth: '24px', textAlign: 'center' }}>Alt</kbd>
                      <kbd style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: '#a855f7', minWidth: '20px', textAlign: 'center' }}>{key}</kbd>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* General shortcuts */}
              <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#10b981', letterSpacing: '1px', marginBottom: '10px' }}>Genel</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  ['?', 'Kısayol yardımı'],
                  ['ESC', 'Kapat / Geri'],
                ].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <kbd style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: '#10b981' }}>{key}</kbd>
                    <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
