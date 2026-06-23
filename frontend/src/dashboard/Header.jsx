import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Bell,
  Settings,
  X,
  Sliders,
  DollarSign,
  ShieldAlert,
  Sun,    /* Thêm icon Mặt Trời */
  Moon    /* Thêm icon Mặt Trăng */
} from 'lucide-react';

import { userApi } from '../api/userApi';
import axiosClient from '../api/axiosClient';

const NOTIFICATION_STORAGE_KEY = 'parking_notifications';

function Header() {
  const [currentUser, setCurrentUser] = useState({
    name: 'Loading...',
    role: 'Staff',
    rawRole: 'PARKING_STAFF'
  });

  const [notifications, setNotifications] = useState([]);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isOpenSettings, setIsOpenSettings] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);

  // --- STATE QUẢN LÝ CHẾ ĐỘ SÁNG / TỐI ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Mặc định kiểm tra trong localStorage xem trước đó có lưu chế độ 'light' không. 
    // Nếu không có, hệ thống chạy mặc định giao diện tối (true).
    return localStorage.getItem('theme') !== 'light';
  });

  const [systemConfig, setSystemConfig] = useState({
    basePrice: 5000,
    overnightPrice: 30000,
    maintenanceMode: false
  });

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);
  const currentUserRef = useRef(currentUser);

  const displayNotifications = notifications.slice(0, 8);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const formatRole = (role) => {
    if (!role) return 'Staff';

    if (role === 'SYSTEM_ADMIN') return 'System Admin';
    if (role === 'PARKING_MANAGER') return 'Parking Manager';
    if (role === 'PARKING_STAFF') return 'Parking Staff';
    if (role === 'DRIVER') return 'Driver';
    if (role === 'USER') return 'User';

    return String(role)
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCurrentUserFromStorage = () => {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      return {
        name: 'Guest User',
        role: 'Staff',
        rawRole: 'PARKING_STAFF'
      };
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      const rawRole = parsedUser.role || parsedUser.roleName || 'PARKING_STAFF';

      return {
        name:
          parsedUser.fullName ||
          parsedUser.name ||
          parsedUser.email ||
          'Parking User',
        role: formatRole(rawRole),
        rawRole
      };
    } catch (error) {
      console.error('Không thể đọc dữ liệu user từ localStorage:', error);

      return {
        name: 'Parking User',
        role: 'Staff',
        rawRole: 'PARKING_STAFF'
      };
    }
  };

  const loadUserInformation = async () => {
    try {
      const response = await axiosClient.get('/auth/me');
      const data = response.data || {};
      const rawRole = data.role || data.roleName || 'PARKING_STAFF';

      const nextUser = {
        name:
          data.fullName ||
          data.name ||
          data.email ||
          'Parking User',
        role: formatRole(rawRole),
        rawRole
      };

      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: rawRole
        })
      );

      setCurrentUser(nextUser);
      currentUserRef.current = nextUser;
    } catch (error) {
      const fallbackUser = getCurrentUserFromStorage();

      setCurrentUser(fallbackUser);
      currentUserRef.current = fallbackUser;
    }
  };

  const getTimeText = (createdAt) => {
    if (!createdAt) return 'Just now';

    const createdDate = new Date(createdAt);

    if (Number.isNaN(createdDate.getTime())) {
      return 'Just now';
    }

    const diffMs = Date.now() - createdDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return `${diffDays}d ago`;
  };

  const loadNotificationsFromStorage = () => {
    const savedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);

    if (!savedNotifications) {
      setNotifications([]);
      return;
    }

    try {
      const parsedNotifications = JSON.parse(savedNotifications);

      setNotifications(Array.isArray(parsedNotifications) ? parsedNotifications : []);
    } catch (error) {
      console.error('Không thể đọc notifications từ localStorage:', error);
      setNotifications([]);
    }
  };

  const saveNotificationsToStorage = (nextNotifications) => {
    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(nextNotifications.slice(0, 30))
    );
  };

  const buildNotificationText = (payload, actor) => {
    if (typeof payload === 'string') {
      return `${actor.name} (${actor.role}) ${payload}`;
    }

    const action = payload?.action || 'performed an action';
    const target = payload?.target ? ` ${payload.target}` : '';
    const detail = payload?.detail ? ` - ${payload.detail}` : '';

    return `${actor.name} (${actor.role}) ${action}${target}${detail}`;
  };

  const triggerNewNotification = (payload) => {
    const actor = currentUserRef.current;
    const text = buildNotificationText(payload, actor);

    const newNotification = {
      id: Date.now(),
      text,
      actorName: actor.name,
      actorRole: actor.role,
      rawRole: actor.rawRole,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setNotifications((prev) => {
      const nextNotifications = [newNotification, ...prev].slice(0, 30);
      saveNotificationsToStorage(nextNotifications);
      return nextNotifications;
    });

    setActiveToast(newNotification);
  };

  // --- EFFECT THEO DÕI BIẾN ISDARKMODE ĐỂ BẬT/TẮT CLASS Ở THẺ BODY ---
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleStorageChange = () => {
      loadUserInformation();
    };

    const handlePageNotification = (event) => {
      triggerNewNotification(event.detail);
    };

    loadUserInformation();
    loadNotificationsFromStorage();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dispatchParkingNotification', handlePageNotification);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dispatchParkingNotification', handlePageNotification);
    };
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!activeToast) return undefined;

    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [activeToast]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpenDropdown(false);
      }

      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsOpenSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsOpenDropdown((prev) => !prev);

    setNotifications((prev) => {
      const nextNotifications = prev.map((notification) => ({
        ...notification,
        isRead: true
      }));

      saveNotificationsToStorage(nextNotifications);

      return nextNotifications;
    });
  };

  const handleLogOut = async () => {
    try {
      await userApi.offline();
    } catch (error) {
      console.error('Set offline failed:', error);
    }

    try {
      await axiosClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.clear();

      window.location.href = '/login';
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  };

  const handleSaveConfig = (event) => {
    event.preventDefault();

    console.log('System config:', systemConfig);

    setIsOpenSettingsModal(false);

    triggerNewNotification({
      action: 'updated system configurations'
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-column-left, #0b0f19)', /* Sử dụng biến CSS để đổi màu nền header */
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))', /* Sử dụng biến CSS cho viền dưới */
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ position: 'relative', width: '320px' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#475569'
          }}
        />

        <input
          type="text"
          placeholder="Search plates, users, or floor ID..."
          style={{
            width: '100%',
            padding: '0.5rem 1rem 0.5rem 2.5rem',
            backgroundColor: 'var(--bg-input, #111827)', /* Sử dụng biến màu input */
            border: '1px solid var(--border-color, #1f2937)',
            borderRadius: '0.375rem',
            color: 'var(--text-main, #f8fafc)',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          position: 'relative'
        }}
      >
        {/* --- NÚT BẤM CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI --- */}
        <button
          type="button"
          onClick={() => setIsDarkMode((prev) => !prev)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease'
          }}
          title={isDarkMode ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
        >
          {isDarkMode ? (
            <Sun size={20} style={{ color: '#f59e0b' }} /> /* Mặt trời màu vàng khi ở chế độ tối */
          ) : (
            <Moon size={20} style={{ color: '#475569' }} /> /* Mặt trăng màu tối khi ở chế độ sáng */
          )}
        </button>

        <div
          ref={dropdownRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={handleBellClick}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Bell
              size={20}
              style={{ color: isOpenDropdown ? 'var(--text-main, #f8fafc)' : '#94a3b8' }}
            />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid var(--bg-column-left, #0b0f19)'
                }}
              />
            )}
          </button>

          {activeToast && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '320px',
                backgroundColor: 'var(--bg-input, #1e293b)',
                border: '1px solid #3b82f6',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                zIndex: 9999
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6'
                  }}
                />

                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: '#3b82f6',
                    textTransform: 'uppercase'
                  }}
                >
                  New Activity
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: 'var(--text-main, #f1f5f9)',
                  lineHeight: '1.4'
                }}
              >
                {activeToast.text}
              </p>
            </div>
          )}

          {isOpenDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '360px',
                backgroundColor: 'var(--bg-column-left, #0f172a)',
                border: '1px solid var(--border-color, #1e293b)',
                borderRadius: '0.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 9998,
                padding: '0.5rem 0'
              }}
            >
              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid var(--border-color, #1e293b)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: 'var(--text-main, #ffffff)'
                  }}
                >
                  Notifications
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      backgroundColor: 'var(--bg-input, #1e293b)',
                      color: 'var(--text-muted, #94a3b8)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem'
                    }}
                  >
                    Total: {notifications.length}
                  </span>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {displayNotifications.length === 0 ? (
                  <div
                    style={{
                      padding: '1rem',
                      color: 'var(--text-muted, #64748b)',
                      fontSize: '0.78rem',
                      textAlign: 'center'
                    }}
                  >
                    No notifications yet.
                  </div>
                ) : (
                  displayNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                        backgroundColor: notification.isRead
                          ? 'transparent'
                          : 'rgba(59, 130, 246, 0.03)',
                        cursor: 'pointer'
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 0.35rem 0',
                          fontSize: '0.78rem',
                          color: 'var(--text-main, #cbd5e1)',
                          lineHeight: '1.4'
                        }}
                      >
                        {notification.text}
                      </p>

                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)' }}>
                        {getTimeText(notification.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          ref={settingsRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpenSettings((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings
              size={20}
              style={{ color: isOpenSettings ? 'var(--text-main, #f8fafc)' : '#94a3b8' }}
            />
          </button>

          {isOpenSettings && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '150px',
                backgroundColor: 'var(--bg-column-left, #0f172a)',
                border: '1px solid var(--border-color, #1e293b)',
                borderRadius: '0.375rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                padding: '0.25rem 0'
              }}
            >
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-main, #cbd5e1)',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsOpenSettingsModal(true);
                  setIsOpenSettings(false);
                }}
              >
                System Settings
              </button>

              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--border-color, #1e293b)',
                  margin: '0.25rem 0'
                }}
              />

              <button
                type="button"
                onClick={handleLogOut}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: 'rgba(255,255,255,0.08)'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '0.88rem',
                fontWeight: '600',
                color: 'var(--text-main, #ffffff)',
                letterSpacing: '0.3px'
              }}
            >
              {currentUser.name}
            </h4>

            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted, #64748b)',
                fontWeight: '500',
                display: 'block',
                marginTop: '1px'
              }}
            >
              {currentUser.role}
            </span>
          </div>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {isOpenSettingsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-column-left, #0f172a)',
              border: '1px solid var(--border-color, #1e293b)',
              borderRadius: '0.75rem',
              width: '450px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              color: 'var(--text-main, #f8fafc)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-color, #1e293b)',
                paddingBottom: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: '#3b82f6' }} />

                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}
                >
                  System Configuration
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsOpenSettingsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #64748b)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveConfig}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {/* Nội dung Form giữ nguyên cấu trúc cũ */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted, #94a3b8)',
                    marginBottom: '0.35rem',
                    fontWeight: '500'
                  }}
                >
                  Base Parking Fee (per hour)
                </label>

                <div style={{ position: 'relative' }}>
                  <DollarSign
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b'
                    }}
                  />

                  <input
                    type="number"
                    value={systemConfig.basePrice}
                    onChange={(event) =>
                      setSystemConfig({
                        ...systemConfig,
                        basePrice: Number(event.target.value)
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.5rem 0.5rem 2rem',
                      backgroundColor: 'var(--bg-input, #111827)',
                      border: '1px solid var(--border-color, #1f2937)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-main, #f8fafc)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted, #94a3b8)',
                    marginBottom: '0.35rem',
                    fontWeight: '500'
                  }}
                >
                  Overnight Rate (Fixed)
                </label>

                <div style={{ position: 'relative' }}>
                  <DollarSign
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b'
                    }}
                  />

                  <input
                    type="number"
                    value={systemConfig.overnightPrice}
                    onChange={(event) =>
                      setSystemConfig({
                        ...systemConfig,
                        overnightPrice: Number(event.target.value)
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.5rem 0.5rem 2rem',
                      backgroundColor: 'var(--bg-input, #111827)',
                      border: '1px solid var(--border-color, #1f2937)',
                      borderRadius: '0.375rem',
                      color: 'var(--text-main, #f8fafc)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderTop: '1px solid var(--border-color, #1e293b)',
                  paddingTop: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ShieldAlert
                    size={16}
                    style={{
                      color: systemConfig.maintenanceMode ? '#ef4444' : '#64748b'
                    }}
                  />

                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}
                    >
                      System Maintenance Portal
                    </span>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
                      Lock check-in/out modules for DB update
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={systemConfig.maintenanceMode}
                  onChange={(event) =>
                    setSystemConfig({
                      ...systemConfig,
                      maintenanceMode: event.target.checked
                    })
                  }
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#ef4444'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '0.75rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsOpenSettingsModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--bg-input, #1e293b)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;