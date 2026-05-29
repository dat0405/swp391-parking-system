import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, X, Sliders, DollarSign, ShieldAlert } from 'lucide-react';

function Header({ fullName, role }) {
  // 1. Quản lý danh sách thông báo (đầu chờ kết nối Realtime/API)
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
  
  // STATE QUẢN LÝ MODAL SYSTEM SETTINGS (CẤU HÌNH BÃI XE)
  const [isOpenSettingsModal, setIsOpenSettingsModal] = useState(false);
  const [systemConfig, setSystemConfig] = useState({
    basePrice: 5000,
    overnightPrice: 30000,
    maintenanceMode: false
  });

  const dropdownRef = useRef(null);
  const settingsRef = useRef(null);

  const displayNotifications = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ==========================================
  // 🌐 EFFECT KHỞI TẠO & LẮNG NGHE SỰ KIỆN TỪ BE
  // ==========================================
  useEffect(() => {
    // 🔑 [API PLACEHOLDER]: FETCH THÔNG BÁO BAN ĐẦU TỪ BE KHI LOAD TRANG
    const fetchNotificationsFromBE = async () => {
      try {
        /* const token = localStorage.getItem('token');
        const response = await axios.get('https://api.parksystem.pro/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.success) {
          setNotifications(response.data.notifications); 
        }
        */
      } catch (error) {
        console.error("Lỗi khi fetch danh sách thông báo từ server:", error);
      }
    };
    fetchNotificationsFromBE();

    // Lắp bộ lắng nghe sự kiện thông báo nội bộ phát ra từ trang Check-in/out
    const handlePageNotification = (event) => {
      const messageContent = event.detail;
      triggerNewNotification(messageContent);
    };

    window.addEventListener('dispatchParkingNotification', handlePageNotification);
    return () => window.removeEventListener('dispatchParkingNotification', handlePageNotification);
  }, []);

  const triggerNewNotification = (text) => {
    const newNoti = { id: Date.now(), text, time: "Just now", isRead: false };
    setNotifications(prev => [newNoti, ...prev]);
    setActiveToast(newNoti);
  };

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Đóng các dropdown khi click ra ngoài vùng hiển thị
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
    // Khi click xem chuông, tự động đánh dấu đã đọc tạm thời ở client
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // ==========================================
  // 🔑 [API PLACEHOLDER]: LOGIC ĐĂNG XUẤT HỆ THỐNG (LOGOUT)
  // ==========================================
  const handleLogOut = async () => {
    console.log("Đang xử lý đăng xuất...");
    try {
      /*
      const token = localStorage.getItem('token');
      await axios.post('https://api.parksystem.pro/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      */
    } catch (error) {
      console.error("Lỗi gọi API logout phía server:", error);
    } finally {
      localStorage.removeItem('token'); 
      localStorage.removeItem('user'); 
      sessionStorage.clear();
      window.location.href = '/login'; 
    }
  };

  // ==========================================
  // 🔑 [API PLACEHOLDER]: BẮN DATA CẤU HÌNH MỚI SANG BE
  // ==========================================
  const updateSystemConfigAPI = async (configData) => {
    /*
    const token = localStorage.getItem('token');
    const response = await axios.put('https://api.parksystem.pro/api/system/config', configData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
    */
    return { success: true, message: "Mockup update success" };
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const result = await updateSystemConfigAPI(systemConfig);
      if (result.success) {
        setIsOpenSettingsModal(false);
        triggerNewNotification("🔧 System configurations updated successfully!");
      } else {
        alert(`Cập nhật lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error("Lỗi kết nối API cấu hình:", error);
      alert("Không thể kết nối đến máy chủ Backend!");
    }
  };

  return (
    <header className="top-header" style={{ position: 'relative' }}>
      
      {/* SEARCH BAR CHUẨN CỦA MÀY */}
      <div className="search-bar">
        <Search size={16} />
        <input type="text" placeholder="Search plates, users, or floor ID..." />
      </div>

      {/* HEADER ACTIONS CHUẨN CỦA MÀY (ĐÃ TÍCH HỢP DROPDOWN & LOGIC) */}
      <div className="header-actions">
        
        {/* NÚT CHUÔNG THÔNG BÁO */}
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button className="icon-btn" onClick={handleBellClick}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot"></span>}
          </button>

          {/* Toast thông báo nhanh (Popup góc nhỏ) */}
          {activeToast && (
            <div style={{
              position: 'absolute', top: '45px', right: '0', width: '280px',
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

          {/* Bảng danh sách thả xuống của Chuông */}
          {isOpenDropdown && (
            <div style={{
              position: 'absolute', top: '45px', right: '0', width: '320px',
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
                    backgroundColor: noti.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)'
                  }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>{noti.text}</p>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{noti.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NÚT BÁNH RĂNG CÀI ĐẶT */}
        <div ref={settingsRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button className="icon-btn" onClick={() => setIsOpenSettings(!isOpenSettings)}>
            <Settings size={18} />
          </button>

          {/* Thả xuống Menu: Cấu hình hệ thống & Logout */}
          {isOpenSettings && (
            <div style={{
              position: 'absolute', top: '45px', right: '0', width: '160px',
              backgroundColor: '#0f172a', border: '1px solid #1e293b',
              borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              zIndex: 9999, padding: '0.25rem 0'
            }}>
              <button
                style={{
                  width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent',
                  border: 'none', color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer'
                }}
                onClick={() => { setIsOpenSettingsModal(true); setIsOpenSettings(false); }}
              >
                System Settings
              </button>
              <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '0.25rem 0' }} />
              <button
                onClick={handleLogOut}
                style={{
                  width: '100%', padding: '0.6rem 1rem', backgroundColor: 'transparent',
                  border: 'none', color: '#ef4444', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {/* THÔNG TIN USER PROFILE VÀ AVATAR CHUẨN CỦA MÀY */}
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{fullName || 'User'}</span>
            <span className="user-role">{role || 'Unknown role'}</span>
          </div>

          <img
            className="user-avatar"
            src="https://danviet-24h.ex-cdn.com/files/upload/2-2021/images/2021-06-26/42725836-adf9-4fc7-8764-9f671109ee3a-1624678195-502-width600height400.jpeg"
            alt="Avatar"
          />
        </div>
      </div>

      {/* MODAL SYSTEM CONFIGURATION (TỰ ĐỘNG HIỂN THỊ KHI BẤM SYSTEM SETTINGS) */}
      {isOpenSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem',
            width: '450px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>System Configuration</h3>
              </div>
              <button onClick={() => setIsOpenSettingsModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Base Parking Fee (per hour)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input 
                    type="number" 
                    value={systemConfig.basePrice}
                    onChange={(e) => setSystemConfig({...systemConfig, basePrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '0.375rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Overnight Rate (Fixed)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input 
                    type="number" 
                    value={systemConfig.overnightPrice}
                    onChange={(e) => setSystemConfig({...systemConfig, overnightPrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '0.375rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ShieldAlert size={16} style={{ color: systemConfig.maintenanceMode ? '#ef4444' : '#64748b' }} />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500' }}>System Maintenance Portal</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Lock check-in/out modules for DB update</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={systemConfig.maintenanceMode}
                  onChange={(e) => setSystemConfig({...systemConfig, maintenanceMode: e.target.checked})}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setIsOpenSettingsModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#1e293b', border: 'none', borderRadius: '0.375rem', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', border: 'none', borderRadius: '0.375rem', color: '#ffffff', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

export default Header;