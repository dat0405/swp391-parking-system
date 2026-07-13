import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  CalendarDays,
  Users,
  CircleDollarSign,
  BarChart3,
  PlusCircle,
  History
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  ROUTE_PERMISSIONS,
  getSavedUserRole
} from '../utils/auth';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = getSavedUserRole();

  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      permission: ROUTE_PERMISSIONS.operationalPages
    },
    {
      label: 'Parking Floors',
      path: '/parking-floors',
      icon: <Layers size={18} />,
      permission: ROUTE_PERMISSIONS.parkingFloors
    },
    {
      label: 'Check-in/out',
      path: '/check-in-out',
      icon: <ArrowLeftRight size={18} />,
      permission: ROUTE_PERMISSIONS.operationalPages
    },
    {
      label: 'New Booking',
      path: '/user-ui',
      icon: <PlusCircle size={18} />,
      permission: ROUTE_PERMISSIONS.booking
    },
    {
      label: 'Booking History',
      path: '/booking-history',
      icon: <History size={18} />,
      permission: ROUTE_PERMISSIONS.bookingHistory
    },
    {
      label: 'Reservations',
      path: '/reservations',
      icon: <CalendarDays size={18} />,
      permission: ROUTE_PERMISSIONS.operationalPages
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={18} />,
      permission: ROUTE_PERMISSIONS.userManagement
    },
    {
      label: 'Price List',
      path: '/pricing-policies',
      icon: <CircleDollarSign size={18} />,
      permission: ROUTE_PERMISSIONS.pricingPolicies
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 size={18} />,
      permission: ROUTE_PERMISSIONS.reports
    }
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (!userRole || !Array.isArray(item.permission)) {
      return false;
    }

    return item.permission.includes(userRole);
  });

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
          <span>ROLE: {userRole || 'GUEST'}</span>
        </div>
      </div>

      <nav
        className="sidebar-menu"
        aria-label="Main navigation"
      >
        {visibleMenuItems.map((item) => {
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`menu-item ${
                active ? 'active' : ''
              }`}
              onClick={() => handleNavigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="menu-item-icon">
                {item.icon}
              </span>

              <span className="menu-item-label">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
