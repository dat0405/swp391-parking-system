import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Bell,
  Settings,
  Sun,
  Moon
} from 'lucide-react';

import { userApi } from '../api/userApi';
import axiosClient from '../api/axiosClient';

const NOTIFICATION_STORAGE_KEY = 'parking_notifications';
const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';

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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);
  const currentUserRef = useRef(currentUser);
  const isLoggingOutRef = useRef(false);

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
    if (
      isLoggingOutRef.current ||
      localStorage.getItem(LOGOUT_FLAG_KEY) === 'true'
    ) {
      return;
    }

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
      if (localStorage.getItem(LOGOUT_FLAG_KEY) === 'true') {
        return;
      }

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
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;
    localStorage.setItem(LOGOUT_FLAG_KEY, 'true');
    localStorage.setItem(LOGOUT_STARTED_AT_KEY, String(Date.now()));

    setIsOpenSettings(false);

    try {
      try {
        await userApi.offline();
      } catch (error) {
        console.error('Set offline failed:', error);
      }

      try {
        await axiosClient.post('/auth/logout', {
          refreshToken: localStorage.getItem('refreshToken')
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.clear();

      /*
       * Không xóa isLoggingOut và logoutStartedAt ở đây.
       * App.jsx sẽ tự xóa sau một khoảng ngắn hoặc khi user login lại.
       * Làm vậy để heartbeat không chạy lại trong lúc redirect.
       */
      window.location.replace('/login');
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-column-left, #0b0f19)',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          position: 'relative'
        }}
      >
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
            <Sun size={20} style={{ color: '#f59e0b' }} />
          ) : (
            <Moon size={20} style={{ color: '#475569' }} />
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
                onClick={handleLogOut}
                disabled={isLoggingOutRef.current}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: isLoggingOutRef.current ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: isLoggingOutRef.current ? 0.6 : 1
                }}
              >
                {isLoggingOutRef.current ? 'Logging out...' : 'Log out'}
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
    </div>
  );
}

export default Header;