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
  History,
} from 'lucide-react';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ROLES,
  ROUTE_PERMISSIONS,
  getSavedUserRole,
  hasRole,
} from '../utils/auth';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = getSavedUserRole();

  /**
   * Kiểm tra menu hiện tại có đang được chọn hay không.
   */
  const isActive = (path) => {
    /*
     * Hai đường dẫn /user-ui và /booking
     * cùng sử dụng trang tạo booking.
     */
    if (
      path === '/user-ui' &&
      location.pathname === '/booking'
    ) {
      return true;
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  /**
   * DRIVER chỉ xem bảng giá.
   *
   * PARKING_MANAGER và SYSTEM_ADMIN
   * quản lý chính sách giá.
   */
  const pricingMenuLabel =
    userRole === ROLES.DRIVER
      ? 'Price List'
      : 'Pricing Policies';

  /**
   * Danh sách menu và quyền tương ứng.
   *
   * SYSTEM_ADMIN:
   * - Toàn bộ chức năng.
   *
   * PARKING_MANAGER:
   * - Dashboard
   * - Parking Floors
   * - Reservations
   * - Pricing Policies
   * - Reports
   *
   * PARKING_STAFF:
   * - Check-in/out
   *
   * DRIVER:
   * - New Booking
   * - Booking History
   * - Parking Floors
   * - Price List
   */
  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      permission: ROUTE_PERMISSIONS.dashboard,
    },
    {
      label: 'Parking Floors',
      path: '/parking-floors',
      icon: <Layers size={18} />,
      permission: ROUTE_PERMISSIONS.parkingFloors,
    },
    {
      label: 'Check-in/out',
      path: '/check-in-out',
      icon: <ArrowLeftRight size={18} />,
      permission: ROUTE_PERMISSIONS.checkInOut,
    },
    {
      label: 'New Booking',
      path: '/user-ui',
      icon: <PlusCircle size={18} />,
      permission: ROUTE_PERMISSIONS.booking,
    },
    {
      label: 'Booking History',
      path: '/booking-history',
      icon: <History size={18} />,
      permission: ROUTE_PERMISSIONS.bookingHistory,
    },
    {
      label: 'Reservations',
      path: '/reservations',
      icon: <CalendarDays size={18} />,
      permission: ROUTE_PERMISSIONS.reservations,
    },
    {
      label: 'User Management',
      path: '/user-management',
      icon: <Users size={18} />,
      permission: ROUTE_PERMISSIONS.userManagement,
    },
    {
      label: pricingMenuLabel,
      path: '/pricing-policies',
      icon: <CircleDollarSign size={18} />,
      permission: ROUTE_PERMISSIONS.pricingPolicies,
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 size={18} />,
      permission: ROUTE_PERMISSIONS.reports,
    },
  ];

  /**
   * Chỉ giữ lại những menu mà role hiện tại
   * được phép truy cập.
   */
  const visibleMenuItems = menuItems.filter(
    (item) => {
      if (
        !userRole ||
        !Array.isArray(item.permission)
      ) {
        return false;
      }

      return hasRole(item.permission);
    }
  );

  const handleNavigate = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  /**
   * Hiển thị tên role trên giao diện.
   *
   * Dự án chỉ có bốn role chính thức.
   * DRIVER chính là người dùng thông thường.
   */
  const getRoleDisplayName = (role) => {
    switch (role) {
      case ROLES.SYSTEM_ADMIN:
        return 'SYSTEM_ADMIN';

      case ROLES.PARKING_MANAGER:
        return 'PARKING_MANAGER';

      case ROLES.PARKING_STAFF:
        return 'PARKING_STAFF';

      case ROLES.DRIVER:
        return 'DRIVER';

      default:
        return 'GUEST';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          P
        </div>

        <div className="brand-text">
          <h2>ParkSystem Pro</h2>

          <span>
            ROLE: {getRoleDisplayName(userRole)}
          </span>
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
              onClick={() =>
                handleNavigate(item.path)
              }
              aria-current={
                active ? 'page' : undefined
              }
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