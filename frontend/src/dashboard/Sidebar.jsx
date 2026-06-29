import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  CalendarDays,
  Users,
  CircleDollarSign,
  BarChart3,
  Settings,
  PlusCircle // Icon dành cho New Booking
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hàm kiểm tra xem Route có đang active hay không để đổi màu chữ/nền trên UI
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">P</div>
        <div className="brand-text">
          <h2>ParkSystem Pro</h2>
          <span>MANAGEMENT CONSOLE</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        {/* Dashboard */}
        <div
          className={`menu-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        {/* Parking Floors & Slots Map */}
        <div 
          className={`menu-item ${isActive('/parking-floors') ? 'active' : ''}`}
          onClick={() => navigate('/parking-floors')}
          style={{ cursor: 'pointer' }}
        >
          <Layers size={18} />
          <span>Parking Floors</span>
        </div>

        {/* Check-in / Out Gate Management */}
        <div
          className={`menu-item ${isActive('/check-in-out') ? 'active' : ''}`}
          onClick={() => navigate('/check-in-out')}
          style={{ cursor: 'pointer' }}
        >
          <ArrowLeftRight size={18} />
          <span>Check-in/out</span>
        </div>

        {/* New Booking (Định vị trong folder user-ui nhưng xài chung bộ khung Admin) */}
        <div 
          className={`menu-item ${isActive('/user-ui') ? 'active' : ''}`}
          onClick={() => navigate('/user-ui')}
          style={{ cursor: 'pointer' }}
        >
          <PlusCircle size={18} />
          <span>New Booking</span>
        </div>

        {/* Reservations Admin List */}
        <div 
          className={`menu-item ${isActive('/reservations') ? 'active' : ''}`}
          onClick={() => navigate('/reservations')}
          style={{ cursor: 'pointer' }}
        >
          <CalendarDays size={18} />
          <span>Reservations</span>
        </div>

        {/* User Management */}
        <div
          className={`menu-item ${isActive('/user-management') ? 'active' : ''}`}
          onClick={() => navigate('/user-management')}
          style={{ cursor: 'pointer' }}
        >
          <Users size={18} />
          <span>User Management</span>
        </div>

        {/* Pricing Policies */}
        <div
          className={`menu-item ${isActive('/pricing-policies') ? 'active' : ''}`}
          onClick={() => navigate('/pricing-policies')}
          style={{ cursor: 'pointer' }}
        >
          <CircleDollarSign size={18} />
          <span>Pricing Policies</span>
        </div>

        {/* Performance Reports */}
        <div 
          className={`menu-item ${isActive('/reports') ? 'active' : ''}`}
          onClick={() => navigate('/reports')}
          style={{ cursor: 'pointer' }}
        >
          <BarChart3 size={18} />
          <span>Reports</span>
        </div>
      </nav>

      {/* Sidebar Footer Section */}
      <div className="sidebar-footer">
        <div className="menu-item" style={{ cursor: 'pointer' }}>
          <Settings size={18} />
          <span>Admin Settings</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;