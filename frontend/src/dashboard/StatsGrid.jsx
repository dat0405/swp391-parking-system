import React from 'react';
import { Database, UserCheck, Users, ShieldAlert } from 'lucide-react';

// Nhận object 'stats' mới được map từ AdminDashboardResponse của Backend xuống qua props
function StatsGrid({ stats }) {
  
  // 🌟 ĐÃ SỬA: Đóng gói chuẩn xác các trường dữ liệu thực tế từ Database thông qua Backend
  const {
    totalUsers = 0,
    activeUsers = 0,
    bannedUsers = 0,
    inactiveUsers = 0,
    totalParkingFacilities = 0,
    totalParkingSlots = 0
  } = stats || {};

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      
      {/* 1. TOTAL PARKING SLOTS */}
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
          {totalParkingSlots.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: '500' }}>
          Across {totalParkingFacilities} facilities
        </div>
      </div>

      {/* 2. ACTIVE USERS */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>ACTIVE USERS</span>
          <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <UserCheck size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {activeUsers.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '500' }}>
          Out of {totalUsers} total users
        </div>
      </div>

      {/* 3. BANNED USERS */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>BANNED USERS</span>
          <div style={{ color: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <ShieldAlert size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {bannedUsers.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
          Suspended accounts
        </div>
      </div>

      {/* 4. INACTIVE USERS */}
      <div className="stat-card" style={{
        backgroundColor: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em' }}>INACTIVE USERS</span>
          <div style={{ color: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Users size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>
          {inactiveUsers.toLocaleString()}
        </h2>
        <div style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: '500' }}>
          Pending activation
        </div>
      </div>

    </div>
  );
}

export default StatsGrid;