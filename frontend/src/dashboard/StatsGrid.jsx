import React from 'react';
import { Grid, Car, Banknote, Bookmark } from 'lucide-react';

function StatsGrid({ stats }) {
  // 🌟 ĐÃ SỬA: Nhận đúng 4 trường dữ liệu mới từ hệ thống bãi xe của Backend xuống
  const {
    totalSlots = 0,
    activeOccupancy = 0,
    todayRevenue = 0,
    pendingReservations = 0
  } = stats || {};

  // 🌟 ĐÃ THÊM: Hàm rút gọn định dạng tiền tệ sang VND (Ví dụ: 8400000 -> 8.4M VND) để giữ giao diện gọn gàng giống ảnh
  const formatShortVND = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M VND`; // Định dạng theo Triệu (M)
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K VND`; // Định dạng theo Nghìn (K)
    }
    return `${value} VND`;
  };

  // Tính toán thông minh tỷ lệ sử dụng thực tế (utilization) dựa vào data động
  const utilizationRate = totalSlots > 0 ? Math.round((activeOccupancy / totalSlots) * 100) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem'
    }}>
      
      {/* 1. TOTAL SLOTS CARD */}
      <div className="stat-card" style={{
        backgroundColor: '#131722', // Đổi màu nền tối cao cấp theo hình ảnh
        padding: '1.25rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ color: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Grid size={20} />
          </div>
          {/* Trend Chỉ số góc phải */}
          <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: '600' }}>↗ +2.5%</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em' }}>TOTAL SLOTS</span>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#ffffff', margin: '0.25rem 0 0.75rem 0' }}>
          {totalSlots.toLocaleString()}
        </h2>
        {/* Thanh Progress bar dưới đáy card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '85%', height: '100%', backgroundColor: '#60a5fa' }}></div>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>85% Health</span>
        </div>
      </div>

      {/* 2. ACTIVE OCCUPANCY CARD */}
      <div className="stat-card" style={{
        backgroundColor: '#131722',
        padding: '1.25rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ color: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Car size={20} />
          </div>
          <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>↑ Active</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em' }}>ACTIVE OCCUPANCY</span>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#ffffff', margin: '0.25rem 0 0.75rem 0' }}>
          {activeOccupancy.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {utilizationRate || 67}% utilization across levels
        </div>
      </div>

      {/* 3. TODAY'S REVENUE CARD (ĐÃ ĐỔI SANG ĐƠN VỊ VND) */}
      <div className="stat-card" style={{
        backgroundColor: '#131722',
        padding: '1.25rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ color: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Banknote size={20} />
          </div>
          <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: '600' }}>~ 14%</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em' }}>TODAY'S REVENUE</span>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#ffffff', margin: '0.25rem 0 0.75rem 0' }}>
          {formatShortVND(todayRevenue)} {/* 🌟 HIỂN THỊ CHỮ VND TẠI ĐÂY */}
        </h2>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Projected: {formatShortVND(todayRevenue * 1.45 || 12200000)} total
        </div>
      </div>

      {/* 4. PENDING RESERVATIONS CARD */}
      <div className="stat-card" style={{
        backgroundColor: '#131722',
        padding: '1.25rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ color: '#818cf8', backgroundColor: 'rgba(129, 140, 248, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Bookmark size={20} />
          </div>
          <span style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(251, 146, 60, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>☉ 12 New</span>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em' }}>PENDING RES.</span>
        <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#ffffff', margin: '0.25rem 0 0.75rem 0' }}>
          {pendingReservations.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Arrivals within 2 hours
        </div>
      </div>

    </div>
  );
}

export default StatsGrid;