import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, X, Sliders, DollarSign, ShieldAlert } from 'lucide-react';

function Header() {
  const [currentUser, setCurrentUser] = useState({ name: "Loading...", role: "Staff" });
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Staff John Doe checked in at Floor 3", time: "Just now", isRead: false },
    { id: 2, text: "Gate 2 automated opening triggered", time: "2m ago", isRead: false },
  ]);

  const [isOpenDropdown, setIsOpenDropdown] = useState(false); 
  const [isOpenSettings, setIsOpenSettings] = useState(false); 
  const [activeToast, setActiveToast] = useState(null); 
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);
  const [systemConfig, setSystemConfig] = useState({ basePrice: 5000, overnightPrice: 30000, maintenanceMode: false });

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const loadUserInformation = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // 🌟 TỰ DỊCH ROLE BACKEND SANG CHỮ HIỂN THỊ ĐẸP
          let displayRole = parsedUser.role || "Staff";
          if (displayRole === "SYSTEM_ADMIN") displayRole = "System Admin";
          else if (displayRole === "PARKING_MANAGER") displayRole = "Parking Manager";
          else if (displayRole === "PARKING_STAFF") displayRole = "Parking Staff";
          else if (displayRole === "DRIVER") displayRole = "Driver";

          setCurrentUser({
            name: parsedUser.fullName || "User",
            role: displayRole
          });
        } catch (e) {
          console.error("Lỗi đọc dữ liệu user:", e);
          setCurrentUser({ name: "Parking User", role: "Staff" });
        }
      } else {
        setCurrentUser({ name: "Guest User", role: "Staff" });
      }
    };

    loadUserInformation();
    window.addEventListener('storage', loadUserInformation);
    return () => window.removeEventListener('storage', loadUserInformation);
  }, []);

  const handleLogOut = () => {
    localStorage.clear();
    window.location.href = '/login'; 
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0b0f19', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: '100%' }}>
      {/* KHU VỰC SEARCH */}
      <div style={{ position: 'relative', width: '320px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input type="text" placeholder="Search plates, users, or floor ID..." style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '0.375rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }} />
      </div>

      {/* KHU VỰC THÔNG TIN NGƯỜI DÙNG */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button onClick={() => setIsOpenSettings(!isOpenSettings)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Settings size={20} /></button>
          {isOpenSettings && (
            <div style={{ position: 'absolute', top: '40px', right: '0', width: '150px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.375rem', padding: '0.25rem 0', zIndex: 9999 }}>
              <button style={{ width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setIsOpenSettingsModal(true); setIsOpenSettings(false); }}>System Settings</button>
              <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '0.25rem 0' }} />
              <button onClick={handleLogOut} style={{ width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', fontWeight: '600' }}>Log out</button>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* PROFILE CHUẨN KHÔNG LO LỖI UNKNOWN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '600', color: '#ffffff' }}>{currentUser.name}</h4>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500', display: 'block' }}>{currentUser.role}</span>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.85rem' }}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;