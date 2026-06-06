import React, { useState } from 'react';
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
import { 
  LayoutGrid, Coffee, ChefHat, Settings, Calendar, Bell, ArrowLeft, 
  ShoppingBag, Layers, CreditCard, Users, DollarSign, Truck, PieChart 
} from 'lucide-react';

function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

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
      case 'expenses':
        return <Expenses />;
      case 'couriers':
        return <Couriers />;
      case 'reports':
        return <Reports />;
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
      case 'expenses':
        return 'Gider Takibi';
      case 'couriers':
        return 'Kurye & Paraüstü Takibi';
      case 'reports':
        return 'Raporlar';
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
      case 'expenses':
        return 'Dükkan kirası, faturalar ve diğer tüm harcamalar';
      case 'couriers':
        return 'Lokal kurye durumları, teslimat günlükleri ve paraüstü avansları';
      case 'reports':
        return 'Detaylı ciro dağılımları ve kâr-zarar analiz raporları';
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
              <Settings size={18} />
              <span>Menü Yönetimi</span>
            </li>
            <li 
              className={`nav-item ${currentTab === 'recipe-stok' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('recipe-stok'); setSelectedTable(null); }}
              style={{ padding: '10px 12px', fontSize: '13px' }}
            >
              <Layers size={18} />
              <span>Reçete & Stok</span>
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
            <div className="date-badge" style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={18} />
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
