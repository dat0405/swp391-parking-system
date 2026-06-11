import React, { useState } from 'react';
import { Car, ChevronLeft, ChevronRight, X, ListFilter } from 'lucide-react';

function RecentActivity({ activities = [] }) {
  // ĐÃ SỬA: Loại bỏ hoàn toàn biến mock cũ, dùng trực tiếp mảng từ Backend truyền vào
  const finalData = activities || [];

  // Cấu hình hiển thị tại Dashboard chính (Cố định tối đa 3 xe mới nhất)
  const mainDashboardItems = finalData.slice(0, 3);

  // State quản lý đóng/mở Màn hình phụ (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cấu hình phân trang nội bộ cho Màn hình phụ (Tối đa 5 xe/trang)
  const [modalPage, setModalPage] = useState(1);
  const itemsPerPage = 5;

  const indexOfLastItem = modalPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentModalItems = finalData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(finalData.length / itemsPerPage) || 1;

  const handleModalPageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setModalPage(pageNumber);
    }
  };

  return (
    <div className="recent-activity-container" style={{
      backgroundColor: '#1e293b',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginTop: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* HEADER CỦA BẢNG CHÍNH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>Recent Activity</h2>
        <span 
          onClick={() => { setIsModalOpen(true); setModalPage(1); }}
          style={{ color: '#3b82f6', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <ListFilter size={14} /> View all logs ({finalData.length})
        </span>
      </div>

      {/* BẢNG CHÍNH TRÊN DASHBOARD (HIỂN THỊ TỐI ĐA 3 XE) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>LICENSE PLATE</th>
              <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>ARRIVAL/ACTION</th>
              <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>ZONE</th>
              <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>TRANSACTION</th>
              <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {mainDashboardItems.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
                  Không có hoạt động nào gần đây từ hệ thống.
                </td>
              </tr>
            ) : (
              mainDashboardItems.map((act, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem', color: '#ffffff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                      <Car size={16} />
                    </div>
                    {act.licensePlate}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>{act.action}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{act.time}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.9rem' }}>{act.zone}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>{act.amount}</div>
                    <div style={{ color: act.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>({act.paymentStatus})</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                      backgroundColor: act.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                      color: act.status === 'ACTIVE' ? '#10b981' : '#94a3b8'
                    }}>
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MÀN HÌNH PHỤ (MODAL POPUP) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1e293b', width: '90%', maxWidth: '900px', borderRadius: '0.75rem',
            padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            
            {/* Header Popup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>All System Logs</h3>
                <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Full real-time history records of vehicle activity.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bảng dữ liệu Popup (Tối đa 5 xe) */}
            <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>LICENSE PLATE</th>
                    <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>ARRIVAL/ACTION</th>
                    <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>ZONE</th>
                    <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>TRANSACTION</th>
                    <th style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.75rem 1rem' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentModalItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
                        Không có dữ liệu log lịch sử.
                      </td>
                    </tr>
                  ) : (
                    currentModalItems.map((act, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', color: '#ffffff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <Car size={16} />
                          </div>
                          {act.licensePlate}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>{act.action}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{act.time}</div>
                        </td>
                        <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.9rem' }}>{act.zone}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>{act.amount}</div>
                          <div style={{ color: act.paymentStatus === 'Paid' ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>({act.paymentStatus})</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                            backgroundColor: act.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                            color: act.status === 'ACTIVE' ? '#10b981' : '#94a3b8'
                          }}>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PHÂN TRANG POPUP */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, finalData.length)} of {finalData.length} logs
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handleModalPageChange(modalPage - 1)}
                    disabled={modalPage === 1}
                    style={{
                      backgroundColor: modalPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
                      color: modalPage === 1 ? '#475569' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.375rem',
                      cursor: modalPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', padding: '0 0.5rem' }}>
                    Page {modalPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handleModalPageChange(modalPage + 1)}
                    disabled={modalPage === totalPages}
                    style={{
                      backgroundColor: modalPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)',
                      color: modalPage === totalPages ? '#475569' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.375rem',
                      cursor: modalPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default RecentActivity;