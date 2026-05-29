import React, { useState, useEffect } from 'react'; 
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css"; 

function DashboardPage() {
  // 1. Khởi tạo giá trị ban đầu là dữ liệu mockup luôn để tránh vỡ khung khi component mount
  const [stats, setStats] = useState({
    totalSlots: 1248,
    activeOccupancy: 842,
    todayRevenue: 8400, 
    pendingRes: 48,
    health: 85,
    utilization: 67
  });

  // 2. CƠ CHẾ GỌI API REAL-TIME (CẬP NHẬT MỖI 5 GIÂY)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 🛠️ HƯỚNG DẪN KẾT NỐI BACKEND SAU NÀY:
        // const response = await fetch('http://localhost:8080/api/dashboard/stats');
        // const data = await response.json();
        // setStats(data);

        // ĐOẠN CODE GIẢ LẬP ĐỔ DATA REAL-TIME:
        // Cập nhật ngẫu nhiên một vài số liệu nhỏ để test tính năng Real-time mà không cần setTimeout chắp vá
        setStats(prev => ({
          ...prev,
          activeOccupancy: Math.floor(Math.random() * (860 - 830) + 830), // Biến động số xe trong bãi
          todayRevenue: prev.todayRevenue + Math.floor(Math.random() * 50)  // Doanh thu nhảy nhẹ
        }));

      } catch (error) {
        console.error("Lỗi khi kết nối API Backend bãi xe:", error);
      }
    };

    // Thiết lập cơ chế tự động gọi lại API sau mỗi 5 giây (5000ms) để cập nhật real-time
    const intervalId = setInterval(fetchDashboardData, 5000);

    // Hủy interval khi component unmount để tránh rò rỉ bộ nhớ (Memory Leak)
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-layout">
      
      {/* 1. CỘT DANH MỤC BÊN TRÁI */}
      <Sidebar />

      {/* MÀN HÌNH CHỨA CHỨC NĂNG BÊN PHẢI */}
      <main className="main-content">
        
        {/* 2. THANH HEADER TOP */}
        <Header fullName="Võ Hoàng Anh" role="Administrator" />

        {/* Tiêu đề trang cố định */}
        <div className="dashboard-title">
          <h1>System Performance</h1>
          <p>Real-time infrastructure status across all parking sectors.</p>
        </div>

        {/* 3. BỐN Ô SỐ LIỆU */}
        <StatsGrid stats={stats} />

        {/* 4. KHỐI BIỂU ĐỒ */}
        <ChartsSection />

      </main>
    </div>
  );
}

export default DashboardPage;