import React, { memo, useEffect, useRef, useState } from 'react';
import {
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
const THEME_STORAGE_KEY = 'theme';
const LOGOUT_GUARD_MS = 15000;
const USER_CACHE_KEY = 'user';
const USER_ROLE_KEY = 'user_role';
const USER_SYNCED_AT_KEY = 'headerUserSyncedAt';
const USER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

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
  const savedUser = localStorage.getItem(USER_CACHE_KEY);

  if (!savedUser) {
    return {
      name: 'Parking User',
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

    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(USER_ROLE_KEY);

    return {
      name: 'Parking User',
      role: 'Staff',
      rawRole: 'PARKING_STAFF'
    };
  }
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'light') return 'light';
  if (savedTheme === 'dark') return 'dark';

  return 'dark';
};

const applyThemeToBody = (theme) => {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    document.body.dataset.theme = 'light';
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    return;
  }

  document.body.classList.remove('light-mode');
  document.body.dataset.theme = 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, 'dark');
};

const clearExpiredLogoutGuard = () => {
  const isLoggingOut = localStorage.getItem(LOGOUT_FLAG_KEY) === 'true';
  const logoutStartedAt = Number(localStorage.getItem(LOGOUT_STARTED_AT_KEY) || 0);

  if (!isLoggingOut) return false;

  const isStillFresh =
    logoutStartedAt > 0 && Date.now() - logoutStartedAt < LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);

  return false;
};

const clearLocalAuthSession = () => {
  /*
   * Cookie-only auth:
   * - access_token and refresh_token are HttpOnly cookies handled by backend.
   * - localStorage only stores non-sensitive UI metadata.
   * - token and refreshToken removals are cleanup for older app versions.
   */
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(USER_CACHE_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_SYNCED_AT_KEY);
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
};

function Header() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUserFromStorage());
  const [notifications, setNotifications] = useState([]);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isOpenSettings, setIsOpenSettings] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);
  const currentUserRef = useRef(currentUser);
  const isLoggingOutRef = useRef(false);
  const hasMountedRef = useRef(false);

  const isDarkMode = theme === 'dark';
  const displayNotifications = notifications.slice(0, 8);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const syncUserState = (nextUser) => {
    const current = currentUserRef.current;

    if (
      current.name === nextUser.name &&
      current.role === nextUser.role &&
      current.rawRole === nextUser.rawRole
    ) {
      return;
    }

    setCurrentUser(nextUser);
    currentUserRef.current = nextUser;
  };

  const shouldSyncUserFromServer = () => {
    const lastSyncedAt = Number(localStorage.getItem(USER_SYNCED_AT_KEY) || 0);

    if (!lastSyncedAt) return true;

    return Date.now() - lastSyncedAt > USER_SYNC_INTERVAL_MS;
  };

  const loadUserInformation = async ({ force = false } = {}) => {
    if (isLoggingOutRef.current || clearExpiredLogoutGuard()) {
      return;
    }

    const fallbackUser = getCurrentUserFromStorage();
    syncUserState(fallbackUser);

    if (!force && !shouldSyncUserFromServer()) {
      return;
    }

    try {
      /*
       * /auth/me is authenticated by HttpOnly cookie.
       * axiosClient has withCredentials=true, so no token is needed in localStorage.
       */
      const response = await axiosClient.get('/auth/me');
      const data = response.data || {};
      const rawRole = data.role || data.roleName || 'PARKING_STAFF';

      const nextUser = {
        name:
          data.fullName ||
          data.name ||
          data.email ||
          fallbackUser.name ||
          'Parking User',
        role: formatRole(rawRole),
        rawRole
      };

      localStorage.setItem(
        USER_CACHE_KEY,
        JSON.stringify({
          userId: data.userId,
          id: data.userId,
          fullName: data.fullName,
          name: data.name,
          email: data.email,
          role: rawRole
        })
      );

      localStorage.setItem(USER_ROLE_KEY, String(rawRole).toUpperCase());
      localStorage.setItem(USER_SYNCED_AT_KEY, String(Date.now()));

      syncUserState(nextUser);
    } catch (error) {
      syncUserState(fallbackUser);
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
    applyThemeToBody(theme);
  }, [theme]);

  useEffect(() => {
    if (hasMountedRef.current) {
      return undefined;
    }

    hasMountedRef.current = true;

    const handleStorageChange = (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextTheme = event.newValue === 'light' ? 'light' : 'dark';
        setTheme(nextTheme);
        return;
      }

      if (event.key === USER_CACHE_KEY) {
        syncUserState(getCurrentUserFromStorage());
        return;
      }

      if (event.key === NOTIFICATION_STORAGE_KEY) {
        loadNotificationsFromStorage();
      }
    };

    const handlePageNotification = (event) => {
      triggerNewNotification(event.detail);
    };

    applyThemeToBody(getInitialTheme());
    syncUserState(getCurrentUserFromStorage());
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

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
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
        /*
         * Cookie-only logout:
         * Do not send refreshToken from localStorage.
         * Backend reads refresh_token from HttpOnly cookie and clears both cookies.
         */
        await axiosClient.post('/auth/logout');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    } finally {
      clearLocalAuthSession();
      sessionStorage.clear();

      window.location.replace('/login');
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  };

  const avatarLetter = currentUser.name
    ? currentUser.name.charAt(0).toUpperCase()
    : 'P';

  return (
    <header
      className="dashboard-header stable-dashboard-header"
      style={{
        boxSizing: 'border-box',
        minHeight: '70px',
        flexShrink: 0,
        animation: 'none',
        transition: 'none',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <style>{`
        .stable-dashboard-header,
        .stable-dashboard-header *,
        .stable-dashboard-header svg,
        .stable-dashboard-header button,
        .stable-dashboard-header input {
          animation: none !important;
        }

        .stable-dashboard-header {
          transform: translateZ(0);
          backface-visibility: hidden;
          will-change: auto;
        }

        .stable-header-icon-button,
        .stable-header-user,
        .stable-header-avatar,
        .stable-header-user-name,
        .stable-header-user-role {
          transition: none !important;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          position: 'relative',
          flexShrink: 0,
          marginLeft: 'auto'
        }}
      >
        <button
          type="button"
          className="stable-header-icon-button"
          onClick={handleToggleTheme}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isDarkMode ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
        >
          {isDarkMode ? (
            <Sun size={20} style={{ color: '#f59e0b' }} />
          ) : (
            <Moon size={20} style={{ color: 'var(--text-muted)' }} />
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
            className="stable-header-icon-button"
            onClick={handleBellClick}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Bell
              size={20}
              style={{
                color: isOpenDropdown ? 'var(--text-main)' : 'var(--text-muted)'
              }}
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
                  border: '2px solid var(--bg-column-left)'
                }}
              />
            )}
          </button>

          {activeToast && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: '0',
                width: '320px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid #3b82f6',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
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
                  color: 'var(--text-main)',
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
                top: '52px',
                right: '0',
                width: '360px',
                backgroundColor: 'var(--bg-column-left)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35)',
                zIndex: 9998,
                padding: '0.5rem 0'
              }}
            >
              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
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
                    color: 'var(--text-main)'
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
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-muted)',
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
                      color: 'var(--text-muted)',
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
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: notification.isRead
                          ? 'transparent'
                          : 'rgba(59, 130, 246, 0.08)',
                        cursor: 'pointer'
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 0.35rem 0',
                          fontSize: '0.78rem',
                          color: 'var(--text-main)',
                          lineHeight: '1.4'
                        }}
                      >
                        {notification.text}
                      </p>

                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted)'
                        }}
                      >
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
            className="stable-header-icon-button"
            onClick={() => setIsOpenSettings((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings
              size={20}
              style={{
                color: isOpenSettings ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            />
          </button>

          {isOpenSettings && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: '0',
                width: '150px',
                backgroundColor: 'var(--bg-column-left)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
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
            backgroundColor: 'var(--border-color)'
          }}
        />

        <div
          className="stable-header-user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: '150px',
            justifyContent: 'flex-end'
          }}
        >
          <div style={{ textAlign: 'right', minWidth: '100px' }}>
            <h4
              className="stable-header-user-name"
              style={{
                margin: 0,
                fontSize: '0.88rem',
                fontWeight: '700',
                color: 'var(--text-main)',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap'
              }}
            >
              {currentUser.name}
            </h4>

            <span
              className="stable-header-user-role"
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                display: 'block',
                marginTop: '1px',
                whiteSpace: 'nowrap'
              }}
            >
              {currentUser.role}
            </span>
          </div>

          <div
            className="stable-header-avatar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem',
              flexShrink: 0
            }}
          >
            {avatarLetter}
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(Header);