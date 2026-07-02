import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Package, Search, X, ToggleLeft, ToggleRight, Trash2, Building2, 
  Layers, Archive, Activity, Eye, ChevronLeft, ChevronRight, MapPin 
} from 'lucide-react';
import { api } from '../context/AdminAuthContext';
import { useAdminProducts } from '../hooks/queries';
import { alertSuccess, alertError, confirmDelete } from '../utils/swal';

// Helper to ensure base64 has data URI prefix
const formatImage = (b64) => {
  if (!b64) return null;
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
};

// Color preview helper
const getColorPreview = (color) => {
  const colorMap = {
    'White': '#FFFFFF',
    'Black': '#000000',
    'Green': '#10B981',
    'Blue': '#3B82F6',
    'Yellow': '#F59E0B',
    'Orange': '#F97316',
    'Cream': '#FFFDD0',
    'Grey': '#6B7280'
  };
  return colorMap[color] || '#CCCCCC';
};

const Products = () => {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: loading, refetch } = useAdminProducts();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const refreshProducts = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.business_name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const openDrawer = async (p) => {
    setDrawerOpen(true);
    setActiveImgIndex(0);
    setSelected({ product: p, images: [], inventory: null, business: null, category: null });
    try {
      const r = await api.get(`/admin/products/${p.sku}`, { params: { viewer_currency: 'UGX' } });
      setSelected(r.data);
    } catch (e) { console.error(e); }
  };

  const toggleStatus = async (sku) => {
    setActionLoading(true);
    try {
      const r = await api.patch(`/admin/products/${sku}/status`);
      await refreshProducts();
      if (selected?.product?.sku === sku) setSelected(s => ({ ...s, product: { ...s.product, is_active: r.data.is_active } }));
      alertSuccess('Status Updated', `Product status is now ${r.data.is_active ? 'Active' : 'Inactive'}.`);
    } catch (e) {
      alertError('Action Failed', e.response?.data?.detail || 'Failed to toggle product status.');
    }
    setActionLoading(false);
  };

  const deleteProduct = async (sku) => {
    const result = await confirmDelete({
      title: 'Delete product?',
      text: 'This product listing will be permanently removed.',
    });
    if (!result.isConfirmed) return;

    setActionLoading(true);
    try { 
      await api.delete(`/admin/products/${sku}`); 
      setDrawerOpen(false); 
      await refreshProducts();
      alertSuccess('Deleted', 'The product listing has been deleted.');
    } catch (e) {
      alertError('Delete Failed', e.response?.data?.detail || 'Failed to delete the product listing.');
    }
    setActionLoading(false);
  };

  const prod = selected?.product;
  const images = selected?.images || [];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>Product Moderation</h1>
        <p>Review and moderate all product listings across the platform.</p>
      </div>

      <div className="controls-bar">
        <div className="search-input-wrap">
          <Search size={16}/>
          <input placeholder="Search by name, SKU or business..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>SKU / Name</th>
              <th>Business</th>
              <th>USD List</th>
              <th>Local (UGX)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="loader-wrap" style={{padding:'40px 0'}}><div className="spinner"/>Loading...</div></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><Package size={40}/><p>No products found.</p></div></td></tr>
            ) : paged.map(p => (
              <tr key={p.sku}>
                <td>
                  <div style={{ width:44, height:44, borderRadius:10, overflow:'hidden', background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.thumbnail ? (
                      <img src={formatImage(p.thumbnail)} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <Package size={20} color="var(--text-subtle)"/>
                    )}
                  </div>
                </td>
                <td>
                  <div className="td-name">{p.name}</div>
                  <div style={{fontFamily:'monospace',fontSize:10,color:'var(--text-subtle)'}}>{p.sku}</div>
                </td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:6, overflow:'hidden', background:'var(--primary-glow)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {p.business_logo ? (
                        <img src={formatImage(p.business_logo)} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : (
                        <Building2 size={12} color="var(--primary)"/>
                      )}
                    </div>
                    <span style={{ fontSize:13, fontWeight:600 }}>{p.business_name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>US${Number(p.listing_price || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>base US${Number(p.base_price || 0).toFixed(2)}</div>
                </td>
                <td>
                  {p.display_listing_price != null ? (
                    <div style={{ fontWeight: 600 }}>{Math.round(p.display_listing_price).toLocaleString()} {p.display_currency || ''}</div>
                  ) : (
                    <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td><span className={`badge ${p.is_active?'badge-active':'badge-inactive'}`}>{p.is_active?'Active':'Inactive'}</span></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openDrawer(p)} title="View Details"><Eye size={14}/></button>
                    <button className={`btn btn-sm btn-icon ${p.is_active?'btn-danger':'btn-success'}`} onClick={()=>toggleStatus(p.sku)} disabled={actionLoading}>
                      {p.is_active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                    </button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={()=>deleteProduct(p.sku)} disabled={actionLoading}><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="p-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {[...Array(totalPages)].map((_,i)=><button key={i} className={`p-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
              <button className="p-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      <div className={`drawer-overlay ${drawerOpen?'open':''}`} onClick={()=>setDrawerOpen(false)}>
        <div className="drawer" onClick={e=>e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><Package size={20}/></div>
              <div><h2>{prod?.name || 'Product Details'}</h2><p>SKU: {prod?.sku}</p></div>
            </div>
            <button className="drawer-close" onClick={()=>setDrawerOpen(false)}><X size={16}/></button>
          </div>
          <div className="drawer-body">
            {prod && <>
              {/* Interactive Image Carousel */}
              <div style={{ marginBottom:24 }}>
                {images.length > 0 ? (
                  <div style={{ position:'relative' }}>
                    <div style={{ width:'100%', height:260, borderRadius:16, overflow:'hidden', background:'var(--surface-2)', border:'1px solid var(--border)', position:'relative' }}>
                      <img 
                        src={formatImage(images[activeImgIndex].base64_content)} 
                        alt="Product" 
                        style={{ width:'100%', height:'100%', objectFit:'contain' }} 
                      />
                      
                      {images.length > 1 && (
                        <>
                          <button 
                            className="p-btn" 
                            style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'white' }}
                            onClick={() => setActiveImgIndex(i => (i === 0 ? images.length - 1 : i - 1))}
                          >
                            <ChevronLeft size={20}/>
                          </button>
                          <button 
                            className="p-btn" 
                            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'white' }}
                            onClick={() => setActiveImgIndex(i => (i === images.length - 1 ? 0 : i + 1))}
                          >
                            <ChevronRight size={20}/>
                          </button>
                          <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
                            {images.map((_, i) => (
                              <div key={i} style={{ width:6, height:6, borderRadius:'50%', background: i === activeImgIndex ? 'var(--primary)' : 'rgba(255,255,255,0.3)', transition:'all 0.2s' }} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {images.length > 1 && (
                      <div style={{ display:'flex', gap:8, marginTop:12, overflowX:'auto', paddingBottom:4 }}>
                        {images.map((img, i) => (
                          <button 
                            key={i} 
                            onClick={() => setActiveImgIndex(i)}
                            style={{ 
                              width:54, height:54, borderRadius:10, overflow:'hidden', flexShrink:0, border:`2px solid ${i === activeImgIndex ? 'var(--primary)' : 'transparent'}`, 
                              padding:0, background:'var(--surface-2)', transition:'all 0.15s', cursor:'pointer' 
                            }}
                          >
                            <img src={formatImage(img.base64_content)} alt={`Thumb ${i}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width:'100%', height:180, borderRadius:16, background:'var(--surface-2)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-subtle)', gap:12, border:'1px dashed var(--border)' }}>
                    <Package size={44} opacity={0.3}/>
                    <span style={{ fontSize:13, fontWeight:600 }}>No Product Images</span>
                  </div>
                )}
              </div>

              {/* Status & Identity */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, background:'var(--glass)', padding:'14px 18px', borderRadius:14, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'var(--primary-glow)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Activity size={18}/>
                  </div>
                  <span style={{ fontSize:14, fontWeight:700 }}>Listing Integrity</span>
                </div>
                <span className={`badge ${prod.is_active?'badge-active':'badge-inactive'}`}>{prod.is_active?'Active':'Inactive'}</span>
              </div>

              {/* Technical Specifications */}
              <div className="detail-section">
                <div className="detail-section-title">Technical Specifications</div>
                <div className="detail-grid">
                  <div className="detail-item"><label>Product Name</label><span>{prod.name}</span></div>
                  <div className="detail-item"><label>SKU Identification</label><span style={{fontFamily:'monospace',fontSize:12, letterSpacing:0.5}}>{prod.sku}</span></div>
                  <div className="detail-item"><label>Base Price (USD)</label><span>US${Number(prod.base_price || 0).toFixed(2)}</span></div>
                  <div className="detail-item"><label>Listing Price (USD)</label><span style={{ fontSize: 16, fontWeight: 800 }}>US${Number(prod.listing_price || 0).toFixed(2)}</span></div>
                  {prod.display_listing_price != null && (
                    <div className="detail-item"><label>Buyer Price (UGX)</label><span style={{ fontWeight: 700 }}>{Math.round(prod.display_listing_price).toLocaleString()} {prod.display_currency}</span></div>
                  )}
                  <div className="detail-item"><label>System Fee</label><span style={{ color: 'var(--primary)' }}>{prod.platform_fee}%</span></div>
                  <div className="detail-item"><label>VAT</label><span>{prod.vat}%</span></div>
                  <div className="detail-item">
                    <label><Layers size={10} style={{ marginRight: 4 }} /> Marketplace Category</label>
                    <span style={{ fontWeight: 700 }}>{prod.category_name || 'Uncategorized'}</span>
                  </div>
                  <div className="detail-item">
                    <label><Archive size={10} style={{marginRight:4}}/> Inventory Status</label>
                    <span style={{ color: (selected.inventory?.quantity||0) === 0 ? 'var(--danger)' : 'var(--success)', fontWeight:900 }}>
                      {selected.inventory?.quantity || 0} In Stock
                    </span>
                  </div>
                  {prod.available_sizes && prod.available_sizes.length > 0 && (
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Available Sizes</label>
                      <div className="detail-chips-container">
                        {prod.available_sizes.map((size, i) => (
                          <span key={i} className="detail-chip detail-chip-size">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {prod.available_colors && prod.available_colors.length > 0 && (
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Available Colors</label>
                      <div className="detail-chips-container">
                        {prod.available_colors.map((color, i) => (
                          <span key={i} className="detail-chip detail-chip-color">
                            <span 
                              className="detail-color-dot" 
                              style={{ background: getColorPreview(color) }}
                            />
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Merchant Ownership */}
              <div className="detail-section" style={{ background:'rgba(79,70,229,0.06)', border:'1px solid var(--primary-glow)', borderRadius:16 }}>
                <div className="detail-section-title" style={{ color:'var(--primary)' }}>Merchant Ownership</div>
                {selected.business ? (
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, borderRadius:12, overflow:'hidden', border:'2px solid var(--border)', background:'white' }}>
                      {selected.business.logo_b64 ? (
                        <img src={formatImage(selected.business.logo_b64)} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : (
                        <div style={{ width:'100%', height:'100%', background:'var(--primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Building2 size={20}/>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>{selected.business.name}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                        <MapPin size={12}/> {selected.business.city}, {selected.business.country}
                      </div>
                    </div>
                    <a href={`/businesses?search=${encodeURIComponent(selected.business.name)}`} className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft:'auto' }}>
                      <Eye size={14}/>
                    </a>
                  </div>
                ) : <span className="text-muted">Business data unavailable</span>}
              </div>

              {prod.description && (
                <div className="detail-section">
                  <div className="detail-section-title">Merchant Description</div>
                  <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7, whiteSpace:'pre-wrap', fontStyle:'italic'}}>{prod.description}</p>
                </div>
              )}
            </>}
          </div>
          <div className="drawer-footer">
            <button className={`btn flex-1 ${prod?.is_active?'btn-danger':'btn-success'}`} disabled={actionLoading} onClick={()=>prod&&toggleStatus(prod.sku)}>
              {prod?.is_active?'Deactivate Product':'Re-Activate Product'}
            </button>
            <button className="btn btn-danger btn-icon" disabled={actionLoading} onClick={()=>prod&&deleteProduct(prod.sku)} title="Permanent Delete"><Trash2 size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
