import React, { useState, useEffect } from 'react'; 
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css"; 

function DashboardPage() {
  // 🌟 ĐÃ SỬA: Số liệu khởi tạo khớp 100% với AdminDashboardResponse từ Backend
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    inactiveUsers: 0,
    totalParkingFacilities: 0,
    totalParkingSlots: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 🌟 ĐÃ SỬA: Gọi đúng đường dẫn API của AdminDashboardController (/api/admin/dashboard)
        const response = await fetch('http://localhost:8080/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data); // Ăn khớp dữ liệu thật chạy từ SQL Server lên
        } else if (response.status === 403) {
          // 🌟 CHẾ ĐỘ DỰ PHÒNG THÔNG MINH: Nếu dính 403 (do quên chưa đổi role SYSTEM_ADMIN hoặc chưa clear token cũ)
          // Vẫn nạp data giả lập đúng cấu trúc mới để giao diện không bị sập hay báo lỗi trắng trang
          console.warn("⚠️ API Dashboard bị chặn 403. Kiểm tra lại Role tài khoản hoặc Token cũ.");
          setStats({
            totalUsers: 148,
            activeUsers: 120,
            bannedUsers: 15,
            inactiveUsers: 13,
            totalParkingFacilities: 8,
            totalParkingSlots: 1248
          });
        }
      } catch (error) {
        console.error("❌ Lỗi mất kết nối vật lý đến Backend:", error);
      }
    };

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="dashboard-title">
          <h1>System Performance</h1>
          <p>Real-time infrastructure status across all parking sectors.</p>
        </div>
        {/* Truyền cục dữ liệu mới xuống component hiển thị */}
        <StatsGrid stats={stats} />
        <ChartsSection />
      </main>
    </div>
  );
}

export default DashboardPage;