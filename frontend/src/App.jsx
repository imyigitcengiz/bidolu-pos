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
import { 
  LayoutGrid, Coffee, ChefHat, Settings, Calendar, Bell, ArrowLeft, 
  ShoppingBag, Layers, CreditCard, Users, DollarSign, Truck, PieChart, BookOpen, Globe, QrCode, Puzzle, MessageSquare,
  Contact, Lock
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
  const [isLanding, setIsLanding] = useState(() => {
    const saved = localStorage.getItem('isLanding');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentTab, setCurrentTab] = useState(() => {
    return localStorage.getItem('currentTab') || 'dashboard';
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
  }, [isLanding]);

  React.useEffect(() => {
    localStorage.setItem('currentTab', currentTab);
  }, [currentTab]);

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

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
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

        {/* Back to Landing Page CTA */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
          <button 
            onClick={() => setIsLanding(true)} 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '10px 14px', fontSize: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}
          >
            <ArrowLeft size={14} /> Tanıtım Sayfası
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="header-container">
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
    </div>
  );
}

export default App;
