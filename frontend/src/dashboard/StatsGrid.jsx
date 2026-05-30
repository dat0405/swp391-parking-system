import React from 'react';
import { Database, UserCheck, DollarSign, Calendar } from 'lucide-react';

// Nhận object 'stats' được truyền từ DashboardPage xuống qua props
function StatsGrid({ stats }) {
  
  // Đề phòng trường hợp API chưa load kịp hoặc stats bị undefined thì gán giá trị mặc định bằng 0
  const {
    totalSlots = 0,
    activeOccupancy = 0,
    todayRevenue = 0,
    pendingRes = 0,
    health = 0,
    utilization = 0
  } = stats || {};

  // Tính toán số liệu dự báo động dựa trên doanh thu thực tế để UI luôn hợp lý khi số nhảy
  const projectedRevenue = todayRevenue > 0 ? (todayRevenue * 1.45) / 1000 : 12.2;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      
      {/* 1. TOTAL SLOTS */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>TOTAL SLOTS</span>
          <div style={{ color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Database size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {totalSlots.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: '500' }}>
          {health}% Health
        </div>
      </div>

      {/* 2. ACTIVE OCCUPANCY */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>ACTIVE OCCUPANCY</span>
          <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <UserCheck size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {activeOccupancy.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '500' }}>
          {utilization}% Utilization
        </div>
      </div>

      {/* 3. TODAY'S REVENUE */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>TODAY'S REVENUE</span>
          <div style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <DollarSign size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          ${(todayRevenue / 1000).toFixed(1)}k
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Projected: ${projectedRevenue.toFixed(1)}k total
        </div>
      </div>

      {/* 4. PENDING RES. */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>PENDING RES.</span>
          <div style={{ color: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Calendar size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {pendingRes}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: '500' }}>
          Arrivals within 2 hours
        </div>
      </div>

    </div>
  );
}

export default StatsGrid;