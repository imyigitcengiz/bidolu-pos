import React, { useState, useEffect } from 'react';
import { Plus, Minus, Send, CreditCard, DollarSign, X, Check, Clock, Utensils } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function OrderTaking({ table, activeOrder, onBack }) {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [existingOrder, setExistingOrder] = useState(activeOrder);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
    if (activeOrder) {
      fetchLatestOrderDetails(activeOrder.id);
    }
  }, [table, activeOrder]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/`);
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/menu-items/`);
      const data = await res.json();
      setMenuItems(data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  const fetchLatestOrderDetails = async (orderId) => {
    const id = orderId || (existingOrder ? existingOrder.id : (activeOrder ? activeOrder.id : null));
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/`);
      const data = await res.json();
      setExistingOrder(data);
    } catch (err) {
      console.error('Error fetching latest order details:', err);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(ci => ci.id === item.id);
    if (existing) {
      setCart(cart.map(ci => ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci));
    } else {
      setCart([...cart, { ...item, quantity: 1, note: '' }]);
    }
  };

  const updateQuantity = (itemId, change) => {
    const item = cart.find(ci => ci.id === itemId);
    if (!item) return;
    
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setCart(cart.filter(ci => ci.id !== itemId));
    } else {
      setCart(cart.map(ci => ci.id === itemId ? { ...ci, quantity: newQty } : ci));
    }
  };

  const updateItemNote = (itemId, note) => {
    setCart(cart.map(ci => ci.id === itemId ? { ...ci, note } : ci));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  };

  const getGrandTotal = () => {
    const existingTotal = existingOrder ? parseFloat(existingOrder.total_amount) : 0;
    return existingTotal + getCartTotal();
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    try {
      const itemsPayload = cart.map(item => ({
        menu_item: item.id,
        quantity: item.quantity,
        note: item.note
      }));

      const res = await fetch(`${API_BASE}/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: table.id,
          items: itemsPayload
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        setExistingOrder(orderData);
        setCart([]); // Clear local cart
        alert('Sipariş başarıyla mutfağa gönderildi!');
        fetchLatestOrderDetails(orderData.id);
      } else {
        alert('Sipariş gönderilirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Error sending order:', err);
      alert('Sistem hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBill = async () => {
    try {
      const res = await fetch(`${API_BASE}/tables/${table.id}/change_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'bill_requested' })
      });
      if (res.ok) {
        alert('Hesap istendi olarak işaretlendi.');
        onBack();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = async () => {
    if (!existingOrder) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${existingOrder.id}/pay_and_close/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          amount: getGrandTotal()
        })
      });

      if (res.ok) {
        const data = await res.json();
        let successMsg = 'Ödeme başarıyla kaydedildi, masa kapatıldı.';
        if (data.whatsapp_simulated) {
          successMsg += `\n\n[WhatsApp API] Otomatik onay mesajı gönderildi:\nAlıcı: ${data.whatsapp_simulated.to}\nMesaj: "${data.whatsapp_simulated.message}"`;
        }
        alert(successMsg);
        setShowPaymentModal(false);
        onBack();
      } else {
        const errorData = await res.json();
        alert(`Hata: ${errorData.error || 'Ödeme tamamlanamadı'}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Ödeme hatası.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => item.category === selectedCategory && item.is_available);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            ← Masalara Dön
          </button>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{table.name} Sipariş & Ödeme</h2>
      </div>

      <div className="order-screen-container">
        {/* Left: Menu selection */}
        <div>
          <div className="menu-categories-bar">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.name}</span>
              </div>
            ))}
          </div>

          <div className="menu-items-grid">
            {filteredMenuItems.map(item => (
              <div className="menu-item-card" key={item.id} onClick={() => addToCart(item)}>
                {item.image && (
                  <img 
                    src={item.image.startsWith('http') ? item.image : `http://localhost:8000${item.image}`} 
                    alt={item.name} 
                    style={{ width: '100%', height: '120px', borderRadius: '10px', objectFit: 'cover', marginBottom: '4px' }} 
                  />
                )}
                <div>
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-desc">{item.description}</div>
                </div>
                <div className="menu-item-bottom">
                  <span className="menu-item-price">{parseFloat(item.price).toLocaleString('tr-TR')} ₺</span>
                  <button className="add-item-btn">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart and active order details */}
        <div>
          <div className="card order-cart-card">
            <div className="order-cart-header">
              <span style={{ fontWeight: '750', fontSize: '16px' }}>Sipariş Detayı</span>
              <span className="badge badge-primary">{table.name}</span>
            </div>

            <div className="order-cart-items">
              {/* Existing order items from DB */}
              {existingOrder && existingOrder.items && existingOrder.items.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Gönderilmiş Siparişler
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {existingOrder.items.map((item, idx) => (
                      <div key={idx} className="cart-item" style={{ borderLeft: '3px solid var(--primary)', background: 'rgba(99, 102, 241, 0.03)' }}>
                        <div className="cart-item-details">
                          <div className="cart-item-name">
                            <span style={{ fontWeight: '700', marginRight: '6px' }}>{item.quantity}x</span>
                            {item.menu_item_name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span className="cart-item-price">
                              {(parseFloat(item.price) * item.quantity).toLocaleString('tr-TR')} ₺
                            </span>
                            <span className={`badge ${item.status === 'served' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {item.status === 'served' ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Check size={10} /> Servis Edildi</span>
                              ) : item.status === 'ready' ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Utensils size={10} /> Hazır</span>
                              ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={10} /> Hazırlanıyor</span>
                              )}
                            </span>
                          </div>
                          {item.note && <div className="cart-item-note">{item.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local Cart items (unsent yet) */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Yeni Eklenecekler
                </div>
                {cart.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-details">
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-price" style={{ margin: '4px 0' }}>
                            {parseFloat(item.price).toLocaleString('tr-TR')} ₺
                          </div>
                          <input 
                            type="text" 
                            placeholder="Mutfak notu ekle..." 
                            value={item.note} 
                            onChange={(e) => updateItemNote(item.id, e.target.value)}
                            className="form-control"
                            style={{ padding: '6px 10px', fontSize: '11px', height: '28px', marginTop: '6px' }}
                          />
                        </div>
                        <div className="cart-item-actions">
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="qty-val">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Eklenecek ürün seçilmedi
                  </div>
                )}
              </div>
            </div>

            {/* Cart Totals */}
            <div className="cart-totals">
              {existingOrder && (
                <div className="totals-row">
                  <span>Mevcut Tutar:</span>
                  <span>{parseFloat(existingOrder.total_amount).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              {cart.length > 0 && (
                <div className="totals-row">
                  <span>Yeni Tutar:</span>
                  <span>{getCartTotal().toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              <div className="totals-row grand">
                <span>Toplam Tutar:</span>
                <span>{getGrandTotal().toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* Cart actions */}
            <div className="cart-actions">
              {cart.length > 0 ? (
                <button 
                  className="btn btn-primary" 
                  onClick={handleSendToKitchen} 
                  disabled={loading}
                  style={{ flex: 2 }}
                >
                  <Send size={16} /> Siparişi Gönder
                </button>
              ) : existingOrder ? (
                <>
                  <button className="btn btn-secondary" onClick={handleRequestBill}>
                    Hesap İste
                  </button>
                  <button className="btn btn-success" onClick={() => setShowPaymentModal(true)}>
                    Ödeme Al
                  </button>
                </>
              ) : (
                <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Sipariş göndermek için soldan ürün ekleyin.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment / Billing Modal */}
      {showPaymentModal && existingOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Hesap Kapatma</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="bill-summary">
              {existingOrder.items.map((item, idx) => (
                <div className="bill-item" key={idx}>
                  <span>{item.quantity}x {item.menu_item_name}</span>
                  <span>{(parseFloat(item.price) * item.quantity).toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
              <div className="bill-total">
                <span>Toplam Hesap:</span>
                <span>{parseFloat(existingOrder.total_amount).toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-muted)' }}>Ödeme Yöntemi</h4>
            <div className="payment-methods-grid">
              <div 
                className={`pay-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Kredi Kartı</span>
              </div>
              <div 
                className={`pay-method-card ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <DollarSign />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Nakit</span>
              </div>
            </div>

            <button 
              className="btn btn-success" 
              onClick={handleCheckout} 
              disabled={loading}
              style={{ width: '100%', padding: '16px' }}
            >
              Ödemeyi Tamamla ve Masayı Boşalt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
