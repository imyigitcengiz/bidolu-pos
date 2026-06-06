import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, PlusCircle, ShoppingCart, Activity } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function RecipeInventory() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'recipes'
  
  // Ingredients State
  const [ingredients, setIngredients] = useState([]);
  const [loadingIng, setLoadingIng] = useState(true);
  
  // Add/Buy Ingredient State
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('kg');
  
  const [purchaseIngId, setPurchaseIngId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  
  // Recipes State
  const [menuItems, setMenuItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  
  // Recipe Form State
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [instructions, setInstructions] = useState('');
  const [recipeIngsList, setRecipeIngsList] = useState([]); // [{ingredient: id, quantity: value}]

  useEffect(() => {
    fetchIngredients();
    fetchRecipesData();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoadingIng(true);
      const res = await fetch(`${API_BASE}/ingredients/`);
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIng(false);
    }
  };

  const fetchRecipesData = async () => {
    try {
      const [itemsRes, recsRes, recIngsRes] = await Promise.all([
        fetch(`${API_BASE}/menu-items/`),
        fetch(`${API_BASE}/recipes/`),
        fetch(`${API_BASE}/recipe-ingredients/`)
      ]);
      const items = await itemsRes.json();
      const recs = await recsRes.json();
      const recIngs = await recIngsRes.json();
      setMenuItems(items);
      setRecipes(recs);
      setRecipeIngredients(recIngs);
      if (items.length > 0) {
        setSelectedMenuItem(items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngName) return;

    try {
      const res = await fetch(`${API_BASE}/ingredients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIngName,
          stock_quantity: parseFloat(newIngQty || 0),
          unit: newIngUnit
        })
      });
      if (res.ok) {
        setNewIngName('');
        setNewIngQty('');
        fetchIngredients();
        alert('Malzeme başarıyla eklendi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchaseStock = async (e) => {
    e.preventDefault();
    if (!purchaseIngId || !purchaseQty) return;

    const ing = ingredients.find(i => i.id === parseInt(purchaseIngId));
    if (!ing) return;

    const updatedQty = parseFloat(ing.stock_quantity) + parseFloat(purchaseQty);

    try {
      // 1. Update ingredient stock
      const ingRes = await fetch(`${API_BASE}/ingredients/${purchaseIngId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: updatedQty })
      });

      // 2. Automatically log expense if cost is entered
      if (purchaseCost && parseFloat(purchaseCost) > 0) {
        await fetch(`${API_BASE}/expenses/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${ing.name} Stok Alımı (${purchaseQty} ${ing.unit})`,
            amount: parseFloat(purchaseCost),
            category: 'Gıda Malzemesi'
          })
        });
      }

      if (ingRes.ok) {
        setPurchaseIngId('');
        setPurchaseQty('');
        setPurchaseCost('');
        fetchIngredients();
        alert('Stok başarıyla güncellendi ve gider kaydedildi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddIngToRecipeForm = () => {
    setRecipeIngsList([...recipeIngsList, { ingredient: ingredients[0]?.id, quantity: '' }]);
  };

  const handleRemoveIngFromRecipeForm = (index) => {
    setRecipeIngsList(recipeIngsList.filter((_, i) => i !== index));
  };

  const handleRecipeFormChange = (index, field, value) => {
    const list = [...recipeIngsList];
    list[index][field] = value;
    setRecipeIngsList(list);
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (!selectedMenuItem) return;

    try {
      // Create Recipe
      const recRes = await fetch(`${API_BASE}/recipes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item: parseInt(selectedMenuItem),
          instructions
        })
      });

      if (recRes.ok) {
        const recipeObj = await recRes.json();
        
        // Add all recipe ingredients
        await Promise.all(recipeIngsList.map(item => {
          const ing = ingredients.find(i => i.id === parseInt(item.ingredient));
          return fetch(`${API_BASE}/recipe-ingredients/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipe: recipeObj.id,
              ingredient: parseInt(item.ingredient),
              quantity: parseFloat(item.quantity),
              unit: ing?.unit || 'pcs'
            })
          });
        }));

        setInstructions('');
        setRecipeIngsList([]);
        fetchRecipesData();
        alert('Reçete başarıyla kaydedildi!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('inventory')}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Stok Durumu & Satın Alım
        </button>
        <button 
          className={`btn ${activeTab === 'recipes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recipes')}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Reçete Yönetimi
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          {/* Ingredients list */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Malzeme Stok Listesi</h3>
            {loadingIng ? (
              <div className="spinner"></div>
            ) : (
              <div className="table-container">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Malzeme Adı</th>
                      <th>Mevcut Stok</th>
                      <th>Birim</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map(ing => {
                      const qty = parseFloat(ing.stock_quantity);
                      let statusBadge = 'badge-success';
                      let statusText = 'Yeterli';
                      if (qty <= 5) {
                        statusBadge = 'badge-danger';
                        statusText = 'Kritik Stok';
                      } else if (qty <= 15) {
                        statusBadge = 'badge-warning';
                        statusText = 'Azalıyor';
                      }
                      return (
                        <tr key={ing.id}>
                          <td style={{ fontWeight: '500' }}>{ing.name}</td>
                          <td style={{ fontWeight: '700' }}>{qty.toLocaleString('tr-TR')}</td>
                          <td>{ing.unit}</td>
                          <td>
                            <span className={`badge ${statusBadge}`}>{statusText}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Purchase Form */}
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} /> Stok Satın Alımı Yap
              </h3>
              <form onSubmit={handlePurchaseStock}>
                <div className="form-group">
                  <label>Malzeme Seçin</label>
                  <select className="form-control form-select" value={purchaseIngId} onChange={(e) => setPurchaseIngId(e.target.value)} required>
                    <option value="" disabled>Seçiniz...</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Alınan Miktar</label>
                  <input type="number" step="0.01" className="form-control" placeholder="Miktar" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Toplam Maliyet (TL)</label>
                  <input type="number" step="0.01" className="form-control" placeholder="örn: 250" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Satın Alımı Tamamla
                </button>
              </form>
            </div>

            {/* Create Ingredient Form */}
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Yeni Malzeme Tanımla</h3>
              <form onSubmit={handleAddIngredient}>
                <div className="form-group">
                  <label>Malzeme Adı</label>
                  <input type="text" className="form-control" placeholder="örn: Domates" value={newIngName} onChange={(e) => setNewIngName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Başlangıç Stok</label>
                  <input type="number" className="form-control" placeholder="0" value={newIngQty} onChange={(e) => setNewIngQty(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Birim</label>
                  <select className="form-control form-select" value={newIngUnit} onChange={(e) => setNewIngUnit(e.target.value)}>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="litre">Litre (L)</option>
                    <option value="adet">Adet (pcs)</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Malzeme Kaydet
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          {/* Recipes list */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Menü Reçeteleri</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {menuItems.map(item => {
                const recipe = recipes.find(r => r.menu_item === item.id);
                const ings = recipe ? recipeIngredients.filter(ri => ri.recipe === recipe.id) : [];
                return (
                  <div key={item.id} style={{ padding: '16px', border: '1px solid var(--panel-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{item.name}</span>
                      {recipe ? (
                        <span className="badge badge-success">Reçete Aktif</span>
                      ) : (
                        <span className="badge badge-danger">Reçete Yok</span>
                      )}
                    </div>
                    {recipe && (
                      <div style={{ marginTop: '12px', fontSize: '14px' }}>
                        <p style={{ color: 'var(--text-muted)' }}><strong>Hazırlanış:</strong> {recipe.instructions}</p>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Malzemeler:</strong>
                          <ul style={{ paddingLeft: '20px', marginTop: '4px', color: 'var(--text-muted)' }}>
                            {ings.map(ri => {
                              const ing = ingredients.find(i => i.id === ri.ingredient);
                              return (
                                <li key={ri.id}>{ri.quantity} {ri.unit} - {ing?.name}</li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add/Edit Recipe Form */}
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Reçete Oluştur</h3>
            <form onSubmit={handleCreateRecipe}>
              <div className="form-group">
                <label>Menü Ürünü</label>
                <select className="form-control form-select" value={selectedMenuItem} onChange={(e) => setSelectedMenuItem(e.target.value)} required>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Hazırlanış Açıklaması</label>
                <textarea className="form-control" rows="3" placeholder="Yemeğin yapılış adımları..." value={instructions} onChange={(e) => setInstructions(e.target.value)}></textarea>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px' }}>Malzemeler</label>
                  <button type="button" className="action-icon-btn" onClick={handleAddIngToRecipeForm}>
                    <Plus size={16} /> Add
                  </button>
                </div>

                {recipeIngsList.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select 
                      className="form-control form-select" 
                      value={item.ingredient} 
                      onChange={(e) => handleRecipeFormChange(idx, 'ingredient', e.target.value)}
                      style={{ flex: 2 }}
                    >
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="Miktar" 
                      value={item.quantity}
                      onChange={(e) => handleRecipeFormChange(idx, 'quantity', e.target.value)}
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="button" className="action-icon-btn delete" onClick={() => handleRemoveIngFromRecipeForm(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Reçeteyi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
