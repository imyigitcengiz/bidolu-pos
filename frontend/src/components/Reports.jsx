import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Activity, FileText, ShoppingBag } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [statsRes, expRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard-stats/`),
        fetch(`${API_BASE}/expenses/`),
        fetch(`${API_BASE}/orders/`)
      ]);
      const stats = await statsRes.json();
      const exps = await expRes.json();
      const ords = await ordRes.json();

      setSales(stats.daily_sales || []);
      setExpenses(exps);
      setOrders(ords);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  // Calculations
  const totalSalesRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    
  const totalExpenseAmt = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netProfit = totalSalesRevenue - totalExpenseAmt;

  // Breakdown by channel/platform
  const channelBreakdown = {
    'Yemeksepeti': 0,
    'Getir': 0,
    'Trendyol Yemek': 0,
    'Migros Yemek': 0,
    'WebSitesi': 0,
    'Masa Satışları': 0
  };

  orders.filter(o => o.status === 'completed').forEach(o => {
    let matched = false;
    for (const ch in channelBreakdown) {
      if (o.table_name && o.table_name.startsWith(ch)) {
        channelBreakdown[ch] += parseFloat(o.total_amount);
        matched = true;
        break;
      }
    }
    if (!matched) {
      channelBreakdown['Masa Satışları'] += parseFloat(o.total_amount);
    }
  });

  // Category breakdown for expenses
  const expenseCatBreakdown = {};
  expenses.forEach(e => {
    const cat = e.category || 'Diğer';
    expenseCatBreakdown[cat] = (expenseCatBreakdown[cat] || 0) + parseFloat(e.amount);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cards summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.01) 100%)' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Brüt Ciro (Satışlar)</h4>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)', marginTop: '8px' }}>
            {totalSalesRevenue.toLocaleString('tr-TR')} ₺
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tüm tamamlanan siparişler</span>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, rgba(244, 63, 94, 0.01) 100%)' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Toplam Gider</h4>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--danger)', marginTop: '8px' }}>
            {totalExpenseAmt.toLocaleString('tr-TR')} ₺
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maaşlar, faturalar ve malzeme alımları</span>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0.01) 100%)' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Net Kâr / Zarar</h4>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '8px' }}>
            {netProfit.toLocaleString('tr-TR')} ₺
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Brüt Ciro - Toplam Gider</span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Channel revenue breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Kanallara Göre Ciro Dağılımı</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(channelBreakdown).map(([channel, amt]) => {
              const pct = totalSalesRevenue > 0 ? (amt / totalSalesRevenue) * 100 : 0;
              return (
                <div key={channel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{channel}</span>
                    <span>{amt.toLocaleString('tr-TR')} ₺ ({pct.toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: channel === 'Masa Satışları' ? 'var(--primary)' : 'var(--accent)',
                        width: `${pct}%`,
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses category breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Gider Kategori Dağılımı</h3>
          {Object.keys(expenseCatBreakdown).length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Henüz harcama kaydı bulunmuyor.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(expenseCatBreakdown).map(([cat, amt]) => {
                const pct = totalExpenseAmt > 0 ? (amt / totalExpenseAmt) * 100 : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{cat}</span>
                      <span>{amt.toLocaleString('tr-TR')} ₺ ({pct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          background: 'var(--danger)',
                          width: `${pct}%`,
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
