import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings } from 'lucide-react';

function Header() {
  // 1. State quản lý thông tin User & Role tự động theo BE
  const [currentUser, setCurrentUser] = useState({
    name: "Phung Thanh DO",
    role: "Admin" // Giá trị hiển thị ban đầu, sẽ bị đè nếu localStorage có data thật
  });

  // 2. Quản lý danh sách thông báo
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Staff John Doe checked in at Floor 3", time: "Just now", isRead: false },
    { id: 2, text: "Gate 2 automated opening triggered", time: "2m ago", isRead: false },
    { id: 3, text: "Floor 1 occupancy reached 90%", time: "10m ago", isRead: true },
    { id: 4, text: "System backup completed successfully", time: "1h ago", isRead: true },
    { id: 5, text: "New staff registration alert: vohoanganh", time: "2h ago", isRead: true },
  ]);

  const [isOpenDropdown, setIsOpenDropdown] = useState(false); 
  const [isOpenSettings, setIsOpenSettings] = useState(false); 
  const [activeToast, setActiveToast] = useState(null); 
  
  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  const displayNotifications = notifications.slice(0, 5);
  const remainingCount = notifications.length - 5;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ==========================================
  // 🌐 SYNC ROLE TỪ BE & LẮNG NGHE SỰ KIỆN PORTAL
  // ==========================================
  useEffect(() => {
    // 🔑 TỰ ĐỘNG ĐỌC ROLE TỪ LOCALSTORAGE KHI LOAD TRANG
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const validRoles = ["Admin", "Parking staff", "User", "Parking management"];
        
        if (parsedUser.role && validRoles.includes(parsedUser.role)) {
          setCurrentUser({
            name: parsedUser.name || "Phung Thanh DO",
            role: parsedUser.role
          });
        }
      } catch (e) {
        console.error("Không thể giải mã data user từ localStorage:", e);
      }
    }

    // Lắng nghe thông báo từ trang CheckInOutPage
    const handlePageNotification = (event) => {
      const messageContent = event.detail;
      console.log("=== CHUÔNG HEADER ĐÃ NHẬN TÍN HIỆU ===", messageContent);
      triggerNewNotification(messageContent);
    };

    window.addEventListener('dispatchParkingNotification', handlePageNotification);

    const fetchNotificationsFromBE = async () => {
      try {
        /*
        const token = localStorage.getItem('token');
        const response = await axios.get('https://api.parksystem.pro/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.success) {
          setNotifications(response.data.notifications); 
        }
        */
      } catch (error) {
        console.error("Lỗi khi lấy thông báo từ Backend:", error);
      }
    };
    fetchNotificationsFromBE();

    return () => {
      window.removeEventListener('dispatchParkingNotification', handlePageNotification);
    };
  }, []);

  const triggerNewNotification = (text) => {
    const newNoti = {
      id: Date.now(), 
      text: text,
      time: "Just now",
      isRead: false
    };
    setNotifications(prev => [newNoti, ...prev]);
    setActiveToast(newNoti);
  };

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpenDropdown(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setIsOpenSettings(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsOpenDropdown(!isOpenDropdown);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleLogOut = () => {
    console.log("Đang đăng xuất hệ thống...");
    localStorage.removeItem('token'); 
    localStorage.removeItem('user'); // Xoá luôn data user khi log out
    sessionStorage.clear();
    window.location.reload(); 
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#0b0f19', padding: '0.75rem 1.5rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)', position: 'relative', width: '100%'
    }}>
      
      {/* LEFT AREA: SEARCH BAR */}
      <div style={{ position: 'relative', width: '320px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input 
          type="text" 
          placeholder="Search plates, users, or floor ID..." 
          style={{
            width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem',
            backgroundColor: '#111827', border: '1px solid #1f2937',
            borderRadius: '0.375rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none'
          }}
        />
      </div>

      {/* RIGHT AREA: ACTIONS & USER PROFILE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
        
        {/* NOTIFICATION BELL CONTAINER */}
        <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={handleBellClick}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={20} style={{ color: isOpenDropdown ? '#f8fafc' : '#94a3b8' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                width: '8px', height: '8px', backgroundColor: '#ef4444',
                borderRadius: '50%', border: '2px solid #0b0f19'
              }} />
            )}
          </button>

          {/* 1. TOAST DROP-DOWN TẠM THỜI */}
          {activeToast && (
            <div style={{
              position: 'absolute', top: '40px', right: '0', width: '280px',
              backgroundColor: '#1e293b', border: '1px solid #3b82f6',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', borderRadius: '0.5rem',
              padding: '0.75rem', zIndex: 9999, animation: 'slideDown 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' }}>New Activity</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#f1f5f9', lineHeight: '1.4' }}>{activeToast.text}</p>
            </div>
          )}

          {/* 2. MENU DROPDOWN CHÍNH CỦA CHUÔNG */}
          {isOpenDropdown && (
            <div style={{
              position: 'absolute', top: '40px', right: '0', width: '320px',
              backgroundColor: '#0f172a', border: '1px solid #1e293b',
              borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              zIndex: 9998, padding: '0.5rem 0'
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>Notifications</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                  Total: {notifications.length}
                </span>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {displayNotifications.map((noti) => (
                  <div key={noti.id} style={{
                    padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.02)',
                    backgroundColor: noti.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
                    cursor: 'pointer'
                  }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>{noti.text}</p>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{noti.time}</span>
                  </div>
                ))}
              </div>

              {remainingCount > 0 && (
                <div style={{
                  padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.75rem',
                  color: '#64748b', borderTop: '1px solid #1e293b', backgroundColor: '#090d16',
                  fontWeight: '500', fontStyle: 'italic'
                }}>
                  and {remainingCount} more notifications... (+...)
                </div>
              )}
            </div>
          )}
        </div>

        {/* SETTINGS ENGINE & DROPDOWN LOG OUT */}
        <div ref={settingsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setIsOpenSettings(!isOpenSettings)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
          >
            <Settings size={20} style={{ color: isOpenSettings ? '#f8fafc' : '#94a3b8' }} />
          </button>

          {isOpenSettings && (
            <div style={{
              position: 'absolute', top: '40px', right: '0', width: '150px',
              backgroundColor: '#0f172a', border: '1px solid #1e293b',
              borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              zIndex: 9999, padding: '0.25rem 0'
            }}>
              <button
                style={{
                  width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent',
                  border: 'none', color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'left',
                  cursor: 'pointer', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e293b'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={() => { alert("System Settings Functional"); setIsOpenSettings(false); }}
              >
                System Settings
              </button>

              <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '0.25rem 0' }} />

              <button
                onClick={handleLogOut}
                style={{
                  width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent',
                  border: 'none', color: '#ef4444', fontSize: '0.8rem', textAlign: 'left',
                  cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* USER PROFILE AREA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: '#ffffff', letterSpacing: '0.3px' }}>
              {currentUser.name}
            </h4>
            {/* 🔑 TEXT ROLE THAY ĐỔI THEO DATA TẠI ĐÂY */}
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500', display: 'block', marginTop: '1px' }}>
              {currentUser.role}
            </span>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
            alt="Admin Avatar" 
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Header;