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
  PlusCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />
    },
    {
      label: 'Parking Floors',
      path: '/parking-floors',
      icon: <Layers size={18} />
    },
    {
      label: 'Check-in/out',
      path: '/check-in-out',
      icon: <ArrowLeftRight size={18} />
    },
    {
      label: 'New Booking',
      path: '/user-ui',
      icon: <PlusCircle size={18} />
    },
    {
      label: 'Reservations',
      path: '/reservations',
      icon: <CalendarDays size={18} />
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={18} />
    },
    {
      label: 'Pricing Policies',
      path: '/pricing-policies',
      icon: <CircleDollarSign size={18} />
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 size={18} />
    }
  ];

  const handleNavigate = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">P</div>

        <div className="brand-text">
          <h2>ParkSystem Pro</h2>
          <span>MANAGEMENT CONSOLE</span>
        </div>
      </div>

      <nav className="sidebar-menu" aria-label="Main navigation">
        {menuItems.map((item) => {
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`menu-item ${active ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="menu-item-icon">{item.icon}</span>
              <span className="menu-item-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="menu-item">
          <span className="menu-item-icon">
            <Settings size={18} />
          </span>
          <span className="menu-item-label">Admin Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;