import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingBag, PieChart, CreditCard, DollarSign } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/dashboard-stats/`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  if (!stats) {
    return <div>Veriler yüklenemedi.</div>;
  }

  // Draw chart calculations
  const sales = stats.daily_sales || [];
  const maxRevenue = Math.max(...sales.map(s => s.revenue), 100) * 1.1; // Add 10% padding
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  // Generate points for SVG Path
  const points = sales.map((s, idx) => {
    const x = paddingX + (idx / Math.max(sales.length - 1, 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (s.revenue / maxRevenue) * (svgHeight - paddingY * 2);
    return { x, y, ...s };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  return (
    <div>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Bugün Toplam Ciro</span>
            <div className="stat-icon-wrapper revenue">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.today_revenue.toLocaleString('tr-TR')} ₺</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Anlık gerçekleşen ödemeler</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Aktif Masa Doluluğu</span>
            <div className="stat-icon-wrapper tables">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.active_tables} / {stats.active_tables + stats.empty_tables}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Boş masa sayısı: {stats.empty_tables}</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Hazırlanan Siparişler</span>
            <div className="stat-icon-wrapper orders">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.active_orders}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mutfaktaki aktif siparişler</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Nakit / Kart Dağılımı</span>
            <div className="stat-icon-wrapper empty">
              <PieChart size={20} />
            </div>
          </div>
          <div className="stat-value">
            <span style={{ fontSize: '16px', color: 'var(--success)' }}>{stats.payment_methods.cash.toLocaleString('tr-TR')} ₺</span>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', margin: '0 8px' }}>/</span>
            <span style={{ fontSize: '16px', color: 'var(--accent)' }}>{stats.payment_methods.card.toLocaleString('tr-TR')} ₺</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nakit / Kredi Kartı cirosu</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Weekly Revenue SVG Chart */}
        <div className="card">
          <div className="card-title">
            <span>Haftalık Satış Grafiği</span>
            <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> Son 7 Gün Satış Analizi
            </span>
          </div>
          <div className="chart-container">
            <svg className="chart-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + ratio * (svgHeight - paddingY * 2);
                return (
                  <line 
                    key={i} 
                    x1={paddingX} 
                    y1={y} 
                    x2={svgWidth - paddingX} 
                    y2={y} 
                    stroke="rgba(0,0,0,0.06)" 
                    strokeWidth="1" 
                  />
                );
              })}

              {/* Area under line */}
              {areaD && <path d={areaD} fill="url(#chartGradient)" />}

              {/* Line path */}
              {pathD && (
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              )}

              {/* Dots & Labels */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    fill="var(--bg-dark)" 
                    stroke="var(--primary)" 
                    strokeWidth="2.5" 
                  />
                  {/* Tooltip text on hover */}
                  <text 
                    x={p.x} 
                    y={p.y - 12} 
                    fill="white" 
                    fontSize="10" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    {p.revenue > 0 ? `${Math.round(p.revenue)}₺` : ''}
                  </text>
                  {/* Date label */}
                  <text 
                    x={p.x} 
                    y={svgHeight - 8} 
                    fill="var(--text-muted)" 
                    fontSize="11" 
                    textAnchor="middle"
                  >
                    {p.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Popular Items Card */}
        <div className="card">
          <div className="card-title">En Popüler Ürünler</div>
          <div className="popular-item-list">
            {stats.popular_items && stats.popular_items.length > 0 ? (
              stats.popular_items.map((item, idx) => (
                <div className="popular-item" key={idx}>
                  <div className="popular-item-info">
                    <div className="popular-item-rank">{idx + 1}</div>
                    <span className="popular-item-name">{item.name}</span>
                  </div>
                  <span className="popular-item-count">{item.count} adet</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                Henüz tamamlanmış satış bulunmuyor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
