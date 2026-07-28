import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Bell,
  CheckCheck,
  LoaderCircle,
  Moon,
  Settings,
  Sun
} from 'lucide-react';

import { userApi } from '../api/userApi';
import axiosClient from '../api/axiosClient';
import { notificationApi } from '../api/notificationApi';

import {
  isSupportedRole,
  normalizeRole
} from '../utils/auth';

const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';
const THEME_STORAGE_KEY = 'theme';

const USER_CACHE_KEY = 'user';
const USER_ROLE_KEY = 'user_role';
const USER_SYNCED_AT_KEY = 'headerUserSyncedAt';

const LOGOUT_GUARD_MS = 15000;
const USER_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const NOTIFICATION_POLL_INTERVAL_MS = 30000;
const MAX_DISPLAY_NOTIFICATIONS = 20;

const formatRole = (role) => {
  const cleanRole = normalizeRole(role);

  if (!cleanRole) {
    return 'Unknown Role';
  }

  if (cleanRole === 'SYSTEM_ADMIN') {
    return 'System Admin';
  }

  if (cleanRole === 'PARKING_MANAGER') {
    return 'Parking Manager';
  }

  if (cleanRole === 'PARKING_STAFF') {
    return 'Parking Staff';
  }

  if (cleanRole === 'DRIVER') {
    return 'Driver';
  }

  return 'Unknown Role';
};

const getEmptyUser = () => ({
  name: 'Parking User',
  role: 'Unknown Role',
  rawRole: ''
});

const getCurrentUserFromStorage = () => {
  const savedUser = localStorage.getItem(
    USER_CACHE_KEY
  );

  if (!savedUser) {
    return getEmptyUser();
  }

  try {
    const parsedUser = JSON.parse(savedUser);

    const rawRole = normalizeRole(
      parsedUser.role ||
        parsedUser.roleName ||
        ''
    );

    return {
      name:
        parsedUser.fullName ||
        parsedUser.name ||
        parsedUser.email ||
        'Parking User',

      role: formatRole(rawRole),

      rawRole: isSupportedRole(rawRole)
        ? rawRole
        : ''
    };
  } catch (error) {
    console.error(
      'Cannot read user data from localStorage:',
      error
    );

    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(USER_ROLE_KEY);

    return getEmptyUser();
  }
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem(
    THEME_STORAGE_KEY
  );

  if (savedTheme === 'light') {
    return 'light';
  }

  if (savedTheme === 'dark') {
    return 'dark';
  }

  return 'dark';
};

const applyThemeToBody = (theme) => {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    document.body.dataset.theme = 'light';

    localStorage.setItem(
      THEME_STORAGE_KEY,
      'light'
    );

    return;
  }

  document.body.classList.remove('light-mode');
  document.body.dataset.theme = 'dark';

  localStorage.setItem(
    THEME_STORAGE_KEY,
    'dark'
  );
};

const clearExpiredLogoutGuard = () => {
  const isLoggingOut =
    localStorage.getItem(LOGOUT_FLAG_KEY) ===
    'true';

  const logoutStartedAt = Number(
    localStorage.getItem(
      LOGOUT_STARTED_AT_KEY
    ) || 0
  );

  if (!isLoggingOut) {
    return false;
  }

  const isStillFresh =
    logoutStartedAt > 0 &&
    Date.now() - logoutStartedAt <
      LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  localStorage.removeItem(LOGOUT_FLAG_KEY);

  localStorage.removeItem(
    LOGOUT_STARTED_AT_KEY
  );

  return false;
};

const clearLocalAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authToken');

  localStorage.removeItem(USER_CACHE_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_SYNCED_AT_KEY);

  localStorage.removeItem(LOGOUT_FLAG_KEY);

  localStorage.removeItem(
    LOGOUT_STARTED_AT_KEY
  );
};

const normalizeNotification = (notification) => ({
  notificationId:
    notification?.notificationId ?? null,

  title:
    notification?.title ||
    'Notification',

  message:
    notification?.message || '',

  notificationType:
    notification?.notificationType ||
    'GENERAL',

  isRead:
    notification?.isRead === true,

  createdAt:
    notification?.createdAt || null,

  readAt:
    notification?.readAt || null
});

const getNotificationTypeLabel = (
  notificationType
) => {
  switch (notificationType) {
    case 'BOOKING_CONFIRMED':
      return 'Booking';

    case 'BOOKING_CANCELLED':
      return 'Booking';

    case 'VEHICLE_CHECKED_IN':
      return 'Check-in';

    case 'VEHICLE_CHECKED_OUT':
      return 'Check-out';

    case 'PARKING_FEE_UPDATED':
      return 'Pricing';

    default:
      return 'System';
  }
};

const getTimeText = (createdAt) => {
  if (!createdAt) {
    return 'Just now';
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return 'Just now';
  }

  const diffMs = Math.max(
    0,
    Date.now() - createdDate.getTime()
  );

  const diffSeconds = Math.floor(
    diffMs / 1000
  );

  const diffMinutes = Math.floor(
    diffSeconds / 60
  );

  const diffHours = Math.floor(
    diffMinutes / 60
  );

  const diffDays = Math.floor(
    diffHours / 24
  );

  if (diffSeconds < 60) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return createdDate.toLocaleDateString(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  );
};

function Header() {
  const [currentUser, setCurrentUser] =
    useState(() =>
      getCurrentUserFromStorage()
    );

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [
    isNotificationsLoading,
    setIsNotificationsLoading
  ] = useState(false);

  const [
    notificationError,
    setNotificationError
  ] = useState('');

  const [
    isOpenDropdown,
    setIsOpenDropdown
  ] = useState(false);

  const [
    isOpenSettings,
    setIsOpenSettings
  ] = useState(false);

  const [theme, setTheme] = useState(
    getInitialTheme
  );

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  const currentUserRef = useRef(
    currentUser
  );

  const isLoggingOutRef = useRef(false);

  const isDarkMode = theme === 'dark';

  const displayNotifications =
    notifications.slice(
      0,
      MAX_DISPLAY_NOTIFICATIONS
    );

  const syncUserState = useCallback(
    (nextUser) => {
      const current =
        currentUserRef.current;

      if (
        current.name === nextUser.name &&
        current.role === nextUser.role &&
        current.rawRole ===
          nextUser.rawRole
      ) {
        return;
      }

      currentUserRef.current = nextUser;
      setCurrentUser(nextUser);
    },
    []
  );

  const redirectToLogin = useCallback(
    () => {
      clearLocalAuthSession();
      sessionStorage.clear();

      window.location.replace('/login');
    },
    []
  );

  const handleRequestError = useCallback(
    (error, fallbackMessage) => {
      if (error?.response?.status === 401) {
        redirectToLogin();
        return;
      }

      console.error(
        fallbackMessage,
        error
      );
    },
    [redirectToLogin]
  );

  const shouldSyncUserFromServer = () => {
    const lastSyncedAt = Number(
      localStorage.getItem(
        USER_SYNCED_AT_KEY
      ) || 0
    );

    if (!lastSyncedAt) {
      return true;
    }

    return (
      Date.now() - lastSyncedAt >
      USER_SYNC_INTERVAL_MS
    );
  };

  const loadUserInformation =
    useCallback(
      async ({ force = false } = {}) => {
        if (
          isLoggingOutRef.current ||
          clearExpiredLogoutGuard()
        ) {
          return;
        }

        const fallbackUser =
          getCurrentUserFromStorage();

        syncUserState(fallbackUser);

        if (
          !force &&
          !shouldSyncUserFromServer()
        ) {
          return;
        }

        try {
          const response =
            await axiosClient.get('/auth/me');

          const data = response.data || {};

          const rawRole = normalizeRole(
            data.role ||
              data.roleName ||
              ''
          );

          if (!isSupportedRole(rawRole)) {
            throw new Error(
              'Unsupported account role'
            );
          }

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
              userId:
                data.userId ?? data.id,

              id:
                data.userId ?? data.id,

              fullName: data.fullName,
              name: data.name,
              email: data.email,
              role: rawRole
            })
          );

          localStorage.setItem(
            USER_ROLE_KEY,
            rawRole
          );

          localStorage.setItem(
            USER_SYNCED_AT_KEY,
            String(Date.now())
          );

          syncUserState(nextUser);
        } catch (error) {
          if (
            error?.response?.status === 401
          ) {
            redirectToLogin();
            return;
          }

          console.error(
            'Load current user failed:',
            error
          );

          syncUserState(fallbackUser);
        }
      },
      [
        redirectToLogin,
        syncUserState
      ]
    );

  /**
   * Tải danh sách notification của
   * đúng tài khoản đang đăng nhập.
   */
  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (isLoggingOutRef.current) {
        return;
      }

      if (!silent) {
        setIsNotificationsLoading(true);
      }

      try {
        const data =
          await notificationApi
            .getMyNotifications();

        const normalizedNotifications =
          data
            .map(normalizeNotification)
            .filter(
              (notification) =>
                notification.notificationId !==
                null
            );

        setNotifications(
          normalizedNotifications
        );

        setUnreadCount(
          normalizedNotifications.filter(
            (notification) =>
              !notification.isRead
          ).length
        );

        setNotificationError('');
      } catch (error) {
        handleRequestError(
          error,
          'Load notifications failed:'
        );

        if (
          error?.response?.status !== 401
        ) {
          setNotificationError(
            'Cannot load notifications.'
          );
        }
      } finally {
        if (!silent) {
          setIsNotificationsLoading(false);
        }
      }
    },
    [handleRequestError]
  );

  /**
   * Poll số notification chưa đọc.
   */
  const loadUnreadCount = useCallback(
    async () => {
      if (isLoggingOutRef.current) {
        return;
      }

      try {
        const count =
          await notificationApi
            .getMyUnreadCount();

        setUnreadCount(count);
      } catch (error) {
        handleRequestError(
          error,
          'Load unread notification count failed:'
        );
      }
    },
    [handleRequestError]
  );

  useEffect(() => {
    applyThemeToBody(theme);
  }, [theme]);

  useEffect(() => {
    currentUserRef.current =
      currentUser;
  }, [currentUser]);

  useEffect(() => {
    const handleStorageChange = (
      event
    ) => {
      if (
        event.key === THEME_STORAGE_KEY
      ) {
        const nextTheme =
          event.newValue === 'light'
            ? 'light'
            : 'dark';

        setTheme(nextTheme);
        return;
      }

      if (event.key === USER_CACHE_KEY) {
        syncUserState(
          getCurrentUserFromStorage()
        );
      }
    };

    applyThemeToBody(
      getInitialTheme()
    );

    syncUserState(
      getCurrentUserFromStorage()
    );

    loadUserInformation();

    window.addEventListener(
      'storage',
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange
      );
    };
  }, [
    loadUserInformation,
    syncUserState
  ]);

  /**
   * Tải notification khi Header mount.
   * Sau đó kiểm tra số chưa đọc mỗi 30 giây.
   */
  useEffect(() => {
    loadNotifications();

    const intervalId =
      window.setInterval(
        loadUnreadCount,
        NOTIFICATION_POLL_INTERVAL_MS
      );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    loadNotifications,
    loadUnreadCount
  ]);

  /**
   * Khi mở dropdown, tải lại danh sách
   * để hiển thị dữ liệu mới nhất.
   */
  useEffect(() => {
    if (!isOpenDropdown) {
      return;
    }

    loadNotifications({
      silent: true
    });
  }, [
    isOpenDropdown,
    loadNotifications
  ]);

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setIsOpenDropdown(false);
      }

      if (
        settingsRef.current &&
        !settingsRef.current.contains(
          event.target
        )
      ) {
        setIsOpenSettings(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const handleBellClick = () => {
    setIsOpenDropdown((previous) =>
      !previous
    );

    setIsOpenSettings(false);
  };

  const handleNotificationClick =
    async (notification) => {
      if (
        !notification ||
        notification.isRead ||
        notification.notificationId ===
          null
      ) {
        return;
      }

      const notificationId =
        notification.notificationId;

      /*
       * Cập nhật giao diện trước để phản hồi
       * ngay lập tức.
       */
      setNotifications((previous) =>
        previous.map((item) =>
          item.notificationId ===
          notificationId
            ? {
                ...item,
                isRead: true,
                readAt:
                  new Date().toISOString()
              }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );

      try {
        const updatedNotification =
          await notificationApi.markAsRead(
            notificationId
          );

        if (updatedNotification) {
          const normalized =
            normalizeNotification(
              updatedNotification
            );

          setNotifications((previous) =>
            previous.map((item) =>
              item.notificationId ===
              notificationId
                ? normalized
                : item
            )
          );
        }
      } catch (error) {
        handleRequestError(
          error,
          'Mark notification as read failed:'
        );

        /*
         * Đồng bộ lại từ backend nếu cập nhật lỗi.
         */
        await loadNotifications({
          silent: true
        });
      }
    };

  const handleMarkAllAsRead = async () => {
    if (unreadCount <= 0) {
      return;
    }

    const previousNotifications =
      notifications;

    const previousUnreadCount =
      unreadCount;

    const readAt =
      new Date().toISOString();

    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        isRead: true,
        readAt:
          notification.readAt || readAt
      }))
    );

    setUnreadCount(0);

    try {
      await notificationApi
        .markAllAsRead();
    } catch (error) {
      handleRequestError(
        error,
        'Mark all notifications as read failed:'
      );

      setNotifications(
        previousNotifications
      );

      setUnreadCount(
        previousUnreadCount
      );
    }
  };

  const handleToggleTheme = () => {
    setTheme((previousTheme) =>
      previousTheme === 'dark'
        ? 'light'
        : 'dark'
    );
  };

  const handleLogOut = async () => {
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;

    localStorage.setItem(
      LOGOUT_FLAG_KEY,
      'true'
    );

    localStorage.setItem(
      LOGOUT_STARTED_AT_KEY,
      String(Date.now())
    );

    setIsOpenSettings(false);
    setIsOpenDropdown(false);

    try {
      try {
        await userApi.offline();
      } catch (error) {
        console.error(
          'Set offline failed:',
          error
        );
      }

      try {
        await axiosClient.post(
          '/auth/logout'
        );
      } catch (error) {
        console.error(
          'Logout failed:',
          error
        );
      }
    } finally {
      redirectToLogin();
    }
  };

  const avatarLetter =
    currentUser.name
      ? currentUser.name
          .charAt(0)
          .toUpperCase()
      : 'P';

  const badgeText =
    unreadCount > 99
      ? '99+'
      : String(unreadCount);

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

        .notification-item-button:hover {
          background-color: rgba(
            59,
            130,
            246,
            0.12
          ) !important;
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
        {/* Theme */}
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
          title={
            isDarkMode
              ? 'Chuyển sang Chế độ Sáng'
              : 'Chuyển sang Chế độ Tối'
          }
        >
          {isDarkMode ? (
            <Sun
              size={20}
              style={{
                color: '#f59e0b'
              }}
            />
          ) : (
            <Moon
              size={20}
              style={{
                color:
                  'var(--text-muted)'
              }}
            />
          )}
        </button>

        {/* Notifications */}
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
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={isOpenDropdown}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell
              size={20}
              style={{
                color: isOpenDropdown
                  ? 'var(--text-main)'
                  : 'var(--text-muted)'
              }}
            />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-8px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  backgroundColor:
                    '#ef4444',
                  color: '#ffffff',
                  borderRadius: '999px',
                  border:
                    '2px solid var(--bg-column-left)',
                  fontSize: '0.62rem',
                  fontWeight: '800',
                  lineHeight: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {badgeText}
              </span>
            )}
          </button>

          {isOpenDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: '0',
                width: '380px',
                maxWidth:
                  'calc(100vw - 24px)',
                backgroundColor:
                  'var(--bg-column-left)',
                border:
                  '1px solid var(--border-color)',
                borderRadius: '0.6rem',
                boxShadow:
                  '0 20px 25px -5px rgba(0, 0, 0, 0.35)',
                zIndex: 9998,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  minHeight: '54px',
                  padding:
                    '0.65rem 0.9rem',
                  borderBottom:
                    '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      color:
                        'var(--text-main)'
                    }}
                  >
                    Notifications
                  </div>

                  <div
                    style={{
                      marginTop: '2px',
                      fontSize: '0.68rem',
                      color:
                        'var(--text-muted)'
                    }}
                  >
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : 'All caught up'}
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={
                      handleMarkAllAsRead
                    }
                    style={{
                      backgroundColor:
                        'transparent',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.3rem'
                    }}
                  >
                    <CheckCheck
                      size={14}
                    />
                    Mark all as read
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}
              >
                {isNotificationsLoading &&
                notifications.length === 0 ? (
                  <div
                    style={{
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        'center',
                      gap: '0.5rem',
                      color:
                        'var(--text-muted)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <LoaderCircle
                      size={17}
                      className="notification-loading-icon"
                    />
                    Loading notifications...
                  </div>
                ) : notificationError &&
                  notifications.length ===
                    0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      color: '#ef4444',
                      fontSize: '0.78rem',
                      textAlign: 'center'
                    }}
                  >
                    {notificationError}

                    <button
                      type="button"
                      onClick={() =>
                        loadNotifications()
                      }
                      style={{
                        display: 'block',
                        margin:
                          '0.65rem auto 0',
                        backgroundColor:
                          'transparent',
                        border:
                          '1px solid var(--border-color)',
                        color:
                          'var(--text-main)',
                        borderRadius:
                          '0.35rem',
                        padding:
                          '0.35rem 0.7rem',
                        cursor: 'pointer',
                        fontSize: '0.72rem'
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : displayNotifications.length ===
                  0 ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      color:
                        'var(--text-muted)',
                      fontSize: '0.78rem',
                      textAlign: 'center'
                    }}
                  >
                    No notifications yet.
                  </div>
                ) : (
                  displayNotifications.map(
                    (notification) => (
                      <button
                        key={
                          notification.notificationId
                        }
                        type="button"
                        className="notification-item-button"
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom:
                            '1px solid var(--border-color)',
                          padding:
                            '0.8rem 0.9rem',
                          backgroundColor:
                            notification.isRead
                              ? 'transparent'
                              : 'rgba(59, 130, 246, 0.08)',
                          cursor:
                            notification.isRead
                              ? 'default'
                              : 'pointer',
                          textAlign: 'left',
                          display: 'block'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems:
                              'flex-start',
                            gap: '0.65rem'
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              flexShrink: 0,
                              marginTop: '6px',
                              borderRadius:
                                '50%',
                              backgroundColor:
                                notification.isRead
                                  ? 'var(--border-color)'
                                  : '#3b82f6'
                            }}
                          />

                          <div
                            style={{
                              minWidth: 0,
                              flex: 1
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent:
                                  'space-between',
                                alignItems:
                                  'flex-start',
                                gap: '0.5rem'
                              }}
                            >
                              <strong
                                style={{
                                  minWidth: 0,
                                  fontSize:
                                    '0.78rem',
                                  color:
                                    'var(--text-main)',
                                  fontWeight:
                                    notification.isRead
                                      ? '600'
                                      : '750',
                                  lineHeight:
                                    '1.35'
                                }}
                              >
                                {
                                  notification.title
                                }
                              </strong>

                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize:
                                    '0.63rem',
                                  color:
                                    '#3b82f6',
                                  fontWeight:
                                    '700',
                                  textTransform:
                                    'uppercase'
                                }}
                              >
                                {getNotificationTypeLabel(
                                  notification.notificationType
                                )}
                              </span>
                            </div>

                            {notification.message && (
                              <p
                                style={{
                                  margin:
                                    '0.3rem 0 0',
                                  fontSize:
                                    '0.72rem',
                                  color:
                                    'var(--text-muted)',
                                  lineHeight:
                                    '1.45',
                                  overflowWrap:
                                    'anywhere'
                                }}
                              >
                                {
                                  notification.message
                                }
                              </p>
                            )}

                            <span
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '0.4rem',
                                fontSize:
                                  '0.65rem',
                                color:
                                  'var(--text-muted)'
                              }}
                            >
                              {getTimeText(
                                notification.createdAt
                              )}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
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
            onClick={() => {
              setIsOpenSettings(
                (previous) => !previous
              );

              setIsOpenDropdown(false);
            }}
            title="Settings"
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
                color: isOpenSettings
                  ? 'var(--text-main)'
                  : 'var(--text-muted)'
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
                backgroundColor:
                  'var(--bg-column-left)',
                border:
                  '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                boxShadow:
                  '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
                zIndex: 9999,
                padding: '0.25rem 0'
              }}
            >
              <button
                type="button"
                onClick={handleLogOut}
                disabled={
                  isLoggingOutRef.current
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  backgroundColor:
                    'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor:
                    isLoggingOutRef.current
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: '600',
                  opacity:
                    isLoggingOutRef.current
                      ? 0.6
                      : 1
                }}
              >
                {isLoggingOutRef.current
                  ? 'Logging out...'
                  : 'Log out'}
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor:
              'var(--border-color)'
          }}
        />

        {/* Current user */}
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
          <div
            style={{
              textAlign: 'right',
              minWidth: '100px'
            }}
          >
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