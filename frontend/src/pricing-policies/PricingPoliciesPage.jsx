import React, { useState } from 'react';

import Header from '../dashboard/Header';
import { 
  Download, 
  Ban, 
  CheckCircle, 
  Edit3, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Car, 
  DollarSign, 
  Star,
  Clock,
  AlertTriangle,
  X,
  Trash2
} from 'lucide-react';

// Thành phần phụ trợ hiển thị các ô thống kê (StatBox Component)
const StatBox = ({ label, value, sub, color }) => (
  <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
        <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '700' }}>{value}</span>
      </div>
      <span style={{ color: '#475569', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{sub}</span>
    </div>
    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '0.5rem' }}>
      {label === 'Active Rules' && <Layers size={20} style={{ color }} />}
      {label === 'Vehicle Types' && <Car size={20} style={{ color }} />}
      {label === 'Avg Hourly Fee' && <DollarSign size={20} style={{ color }} />}
      {label === 'Special Rates' && <Star size={20} style={{ color }} />}
    </div>
  </div>
);

function PricingPoliciesPage() {
  // =========================================================================
  // 1. STATE MOCK DATA FOR STANDARD PRICING RULES
  // =========================================================================
  const [rules, setRules] = useState([
    { id: 'PR-001', type: 'Standard Sedan', hourly: 3.00, daily: 25.00, overnight: 15.00, date: 'Oct 12, 2023', status: 'ACTIVE' },
    { id: 'PR-002', type: 'EV (Charging Incl.)', hourly: 5.50, daily: 45.00, overnight: 20.00, date: 'Nov 01, 2023', status: 'ACTIVE' },
    { id: 'PR-003', type: 'Heavy Commercial', hourly: 8.00, daily: 60.00, overnight: 35.00, date: 'Sep 15, 2023', status: 'DISABLED' },
    { id: 'PR-004', type: 'SUV & Crossover', hourly: 4.50, daily: 35.00, overnight: 18.00, date: 'Dec 05, 2023', status: 'ACTIVE' },
    { id: 'PR-005', type: 'Motorcycle / Scooter', hourly: 1.50, daily: 10.00, overnight: 5.00, date: 'Jan 10, 2024', status: 'ACTIVE' }
  ]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  // Pagination processing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRules = rules.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rules.length / itemsPerPage);

  // Toggle status rule (ACTIVE <=> DISABLED) - NO TRASH ICON
  const toggleRuleStatus = (id) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, status: rule.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : rule
    ));
  };

  const handleRowsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };

  // REAL CSV EXPORT LOGIC AS REQUESTED
  const handleExportCSV = () => {
    const headers = ["Rule ID,Vehicle Type,Hourly,Daily,Overnight,Date,Status"];
    const rows = rules.map(r => `${r.id},${r.type},$${r.hourly},$${r.daily},$${r.overnight},${r.date},${r.status}`);
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Pricing_Rules_Export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };


  // =========================================================================
  // 2. STATE MOCK DATA & HANDLERS FOR SPECIAL RATES (MANUAL INPUT MODAL)
  // =========================================================================
  const [specialRates, setSpecialRates] = useState([
    { id: 'SR-001', label: 'Saturday & Sunday', sub: 'Flat multiplier applied to base rates', multiplier: '1.5x' },
    { id: 'SR-002', label: 'Public Holidays', sub: 'Premium rate for high-demand dates', multiplier: '2.0x' }
  ]);

  // Modal Interactive Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRateLabel, setNewRateLabel] = useState('');
  const [newRateSub, setNewRateSub] = useState('');
  const [newRateMultiplier, setNewRateMultiplier] = useState('1.2x');

  // 🛠️ 6. PHẦN MỚI THÊM: HÀM XỬ LÝ XÓA SPECIAL RATE (CÓ CỔNG CHỜ API BACKEND)
  const handleDeleteSpecialRate = async (id, label) => {
    if (!window.confirm(`Are you sure you want to delete special rate: "${label}"?`)) {
      return;
    }

    console.log(`Gửi yêu cầu xóa Special Rate ID: ${id} lên Backend...`);

    // =========================================================================
    // 🔲 CHỖ TRỐNG KẾT NỐI API XÓA SPECIAL RATE VỚI BACKEND SAU NÀY
    // =========================================================================
    /*
    try {
      const response = await fetch(`http://localhost:8080/api/pricing/special-rate/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error("Lỗi kết nối server Backend khi xóa Special Rate");
      console.log(`Backend đã xóa thành công Special Rate: ${id}`);
    } catch (error) {
      console.error("Lỗi gọi API xóa Special Rate:", error);
      alert("Không thể xóa Special Rate trên hệ thống Backend!");
      return; 
    }
    */
    // =========================================================================

    // Cập nhật State Frontend: Lọc bỏ dòng special rate vừa bấm (-1 counter)
    setSpecialRates(specialRates.filter(rate => rate.id !== id));
  };

  // 7. HÀM XỬ LÝ SUBMIT FORM CHO + CONFIGURE NEW SPECIAL RATE (+1 counter)
  const handleAddSpecialRateSubmit = async (e) => {
    e.preventDefault();

    const newRateData = {
      id: `SR-00${specialRates.length + 1}`, 
      label: newRateLabel,
      sub: newRateSub,
      multiplier: newRateMultiplier.endsWith('x') ? newRateMultiplier : `${newRateMultiplier}x`
    };

    setSpecialRates([...specialRates, newRateData]);
    setNewRateLabel('');
    setNewRateSub('');
    setNewRateMultiplier('1.2x');
    setIsModalOpen(false);
  };


  // =========================================================================
  // 3. STATE MOCK DATA FOR ADMINISTRATIVE FEES
  // =========================================================================
  const [adminFees] = useState([
    { id: 'AF-001', title: 'Lost Ticket Fee', subtitle: 'Maximum daily rate + Penalty', amount: 50.00 },
    { id: 'AF-002', title: 'Overstay Penalty', subtitle: 'Per hour after reservation end', amount: 10.00 }
  ]);


  return (
    <div className="dashboard-layout" style={{ position: 'relative' }}>
      <Sidebar />
      <main className="main-content">
        <Header />

        {/* HEADER TRANG */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="dashboard-title">
            <h1>Pricing Policies</h1>
            <p>Configure and manage dynamic pricing across all parking zones.</p>
          </div>
        </div>

        {/* 4 Ô THỐNG KÊ TRÊN CÙNG (AUTOMATIC COUNTER LINKED) */}
        <div style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(3, 1fr)', 
  gap: '1.5rem', 
  marginBottom: '2rem' 
}}>
          <StatBox label="Active Rules" value={String(rules.filter(r => r.status === 'ACTIVE').length).padStart(2, '0')} sub="Live rules" color="#3b82f6" />
          <StatBox label="Vehicle Types" value="02" sub="Cars, Motorcycles" color="#a855f7" />
          {/* Ô THỐNG KÊ NÀY TỰ ĐỘNG CẬP NHẬT KHI THÊM/XÓA SPECIAL RATE */}
          <StatBox label="Special Rates" value={String(specialRates.length).padStart(2, '0')} sub="Weekend, Holiday, VIP" color="#f59e0b" />
        </div>


        {/* ========================================== */}
        {/* MAIN DATA BLOCK: STANDARD PRICING RULES    */}
        {/* ========================================== */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '2rem' }}>
          
          {/* Header Action Row (CLEANED - NO FILTER BUTTON, KEPT EXPORT CSV) */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>Standard Pricing Rules</h3>
            <div>
              <button 
                onClick={handleExportCSV}
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid #334155', color: '#cbd5e1', padding: '0.4rem 0.85rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', color: '#64748b' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600' }}>RULE ID</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>VEHICLE TYPE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>HOURLY PRICE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>DAILY PRICE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>OVERNIGHT FEE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>EFFECTIVE DATE</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>STATUS</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentRules.map((rule) => (
                <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', opacity: rule.status === 'DISABLED' ? 0.5 : 1, transition: 'all 0.2s ease' }}>
                  <td style={{ padding: '1.1rem 1.5rem', fontWeight: '600', color: '#cbd5e1' }}>{rule.id}</td>
                  <td style={{ padding: '1.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: '500' }}>
                      <Car size={15} style={{ color: '#64748b' }} />
                      {rule.type}
                    </div>
                  </td>
                  <td style={{ padding: '1.1rem', color: '#cbd5e1' }}>${rule.hourly.toFixed(2)}</td>
                  <td style={{ padding: '1.1rem', color: '#cbd5e1' }}>${rule.daily.toFixed(2)}</td>
                  <td style={{ padding: '1.1rem', color: '#cbd5e1' }}>${rule.overnight.toFixed(2)}</td>
                  <td style={{ padding: '1.1rem', color: '#64748b' }}>{rule.date}</td>
                  <td style={{ padding: '1.1rem' }}>
                    <span style={{ backgroundColor: rule.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: rule.status === 'ACTIVE' ? '#10b981' : '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                      {rule.status}
                    </span>
                  </td>
                  <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Edit3 size={15} style={{ cursor: 'pointer', color: '#3b82f6' }} title="Edit Policy Configuration" />
                      {rule.status === 'ACTIVE' ? (
                        <Ban size={15} onClick={() => toggleRuleStatus(rule.id)} style={{ cursor: 'pointer', color: '#f59e0b' }} title="Disable Rule" />
                      ) : (
                        <CheckCircle size={15} onClick={() => toggleRuleStatus(rule.id)} style={{ cursor: 'pointer', color: '#10b981' }} title="Enable Rule" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* FRONTEND PAGINATION MANAGEMENT BAR */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.15)' }}>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Showing <strong style={{ color: '#fff', fontWeight: '600' }}>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, rules.length)}</strong> of <strong style={{ color: '#fff', fontWeight: '600' }}>{rules.length}</strong> pricing rules
            </span>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                <span>Rows per page:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={handleRowsPerPageChange}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  style={{ backgroundColor: currentPage === 1 ? 'rgba(51,65,85,0.3)' : '#334155', border: 'none', color: currentPage === 1 ? '#475569' : '#fff', padding: '0.35rem', borderRadius: '0.375rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={15} />
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  style={{ backgroundColor: currentPage === totalPages ? 'rgba(51,65,85,0.3)' : '#334155', border: 'none', color: currentPage === totalPages ? '#475569' : '#fff', padding: '0.35rem', borderRadius: '0.375rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* ================================================================= */}
        {/* BOTTOM SECTION LAYOUT GRID: SPECIAL RATES & ADMINISTRATIVE FEES  */}
        {/* ================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {/* BLOCK 1: WEEKEND & HOLIDAY RATES MANAGEMENT */}
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} style={{ color: '#f97316' }} /> Weekend & Holiday Rates
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, marginBottom: '1.25rem' }}>
              {specialRates.map((rate) => (
                <div key={rate.id} style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.15rem' }}>{rate.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{rate.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>{rate.multiplier}</div>
                      <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.05em' }}>ACTIVE</span>
                    </div>
                    {/* BUTTON TO TRIGGER ACTION DELETE WITH STATE FILTER UPDATING */}
                    <button 
                      onClick={() => handleDeleteSpecialRate(rate.id, rate.label)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Special Rate"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ width: '100%', border: '1px dashed #334155', backgroundColor: 'transparent', color: '#cbd5e1', padding: '0.65rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', transition: 'all 0.2s ease' }}
            >
              + Configure New Special Rate
            </button>
          </div>

          {/* BLOCK 2: ADMINISTRATIVE FEES */}
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} /> Administrative Fees
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {adminFees.map((fee) => (
                <div key={fee.id} style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                      <Clock size={16} style={{ color: '#64748b' }} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.15rem' }}>{fee.title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{fee.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
                    ${fee.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', backgroundColor: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', padding: '0.75rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#3b82f6', fontSize: '1rem' }}>ⓘ</span>
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, lineHeight: '1.4' }}>
                These fees are automatically appended to the final transaction.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* ================================================================= */}
      {/* INTERACTIVE FORM DIALOG MODAL WITH CUSTOM FIELDS SUBMISSION     */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#1e293b', width: '420px', borderRadius: '0.75rem', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: '600' }}>Configure New Special Rate</h4>
              <X size={18} style={{ color: '#64748b', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)} />
            </div>

            {/* INTEGRATED SUBMIT FORM EXECUTING HANDLER */}
            <form onSubmit={handleAddSpecialRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>Rate Label *</label>
                <input 
                  type="text" 
                  placeholder="e.g., Midnight Rush, Weekend Special" 
                  value={newRateLabel}
                  onChange={(e) => setNewRateLabel(e.target.value)}
                  required
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>Subtitle / Description</label>
                <input 
                  type="text" 
                  placeholder="e.g., Higher multipliers for overnight events" 
                  value={newRateSub}
                  onChange={(e) => setNewRateSub(e.target.value)}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>Rate Multiplier *</label>
                <input 
                  type="text" 
                  placeholder="e.g., 1.5x or 1.8" 
                  value={newRateMultiplier}
                  onChange={(e) => setNewRateMultiplier(e.target.value)}
                  required
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '0.45rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '0.45rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Save Rate
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PricingPoliciesPage;