import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  CalendarDays,
  Users,
  CircleDollarSign,
  BarChart3,
  Settings
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">P</div>
        <div className="brand-text">
          <h2>ParkSystem Pro</h2>
          <span>MANAGEMENT CONSOLE</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <div
          className={`menu-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div className="menu-item">
          <Layers size={18} />
          <span>Parking Floors</span>
        </div>

        <div
          className={`menu-item ${isActive('/check-in-out') ? 'active' : ''}`}
          onClick={() => navigate('/check-in-out')}
          style={{ cursor: 'pointer' }}
        >
          <ArrowLeftRight size={18} />
          <span>Check-in/out</span>
        </div>

        <div className="menu-item">
          <CalendarDays size={18} />
          <span>Reservations</span>
        </div>

        <div className="menu-item">
          <Users size={18} />
          <span>User Management</span>
        </div>

        <div
          className={`menu-item ${isActive('/pricing-policies') ? 'active' : ''}`}
          onClick={() => navigate('/pricing-policies')}
          style={{ cursor: 'pointer' }}
        >
          <CircleDollarSign size={18} />
          <span>Pricing Policies</span>
        </div>

        <div className="menu-item">
          <BarChart3 size={18} />
          <span>Reports</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="menu-item">
          <Settings size={18} />
          <span>Admin Settings</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;