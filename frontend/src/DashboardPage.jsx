import React, { useState, useEffect } from 'react'; // Đã thêm useState và useEffect để xử lý dữ liệu động
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css"; 

function DashboardPage() {
  // 1. KHỞI TẠO STATE CHỨA SỐ LIỆU ĐỘNG (Ban đầu bằng 0 để chờ API từ Backend)
  const [stats, setStats] = useState({
    totalSlots: 0,
    activeOccupancy: 0,
    todayRevenue: 0,
    pendingRes: 0,
    health: 0,
    utilization: 0
  });

  // 2. CƠ CHẾ GỌI API REAL-TIME (CẬP NHẬT MỖI 5 GIÂY)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 🛠️ HƯỚNG DẪN KẾT NỐI BACKEND SAU NÀY:
        // Mở comment 3 dòng dưới này ra và thay URL API thật 
        // const response = await fetch('http://localhost:8080/api/dashboard/stats');
        // const data = await response.json();
        // setStats(data);

        // ĐOẠN CODE GIẢ LẬP ĐỔ DATA (Xóa đoạn này đi khi lắp API thật):
        // Giả lập sau 0.5 giây Backend trả về data để giao diện không bị trống dữ liệu ban đầu
        setTimeout(() => {
          setStats({
            totalSlots: 1248,
            activeOccupancy: 842,
            todayRevenue: 8400, // Doanh thu gốc 
            pendingRes: 48,
            health: 85,
            utilization: 67
          });
        }, 4000);

      } catch (error) {
        console.error("Lỗi khi kết nối API Backend bãi xe:", error);
      }
    };

    // Gọi hàm fetch lần đầu tiên khi vừa vào trang
    fetchDashboardData();

    // Thiết lập cơ chế tự động gọi lại API sau mỗi 5 giây (5000ms) để cập nhật real-time
    const intervalId = setInterval(fetchDashboardData, 5000);

    // Hủy interval khi người dùng chuyển sang trang khác để tránh rò rỉ bộ nhớ (Memory Leak)
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-layout">
      
      {/* 1. CỘT DANH MỤC BÊN TRÁI */}
      <Sidebar />

      {/* MÀN HÌNH CHỨA CHỨC NĂNG BÊN PHẢI */}
      <main className="main-content">
        
        {/* 2. THANH HEADER TOP */}
        <Header />

        {/* Tiêu đề trang cố định */}
        <div className="dashboard-title">
          <h1>System Performance</h1>
          <p>Real-time infrastructure status across all parking sectors.</p>
        </div>

        {/* 3. BỐN Ô SỐ LIỆU - ĐÃ TRUYỀN STATE ĐỘNG XUỐNG COMPONENT CON */}
        <StatsGrid stats={stats} />

        {/* 4. KHỐI BIỂU ĐỒ (KẾT NỐI API SAU) */}
        <ChartsSection />

      </main>
    </div>
  );
}

export default DashboardPage;