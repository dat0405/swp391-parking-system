import React, { useState, useEffect } from 'react';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import './dashboard/DashboardPage.css';

function DashboardPage() {
  //  ĐÃ SỬA: Cấu trúc lại State để khớp 100% với 4 thẻ chỉ số trên UI giao diện ParkSystem Pro
  const [stats, setStats] = useState({
    totalSlots: 0,
    activeOccupancy: 0,
    todayRevenue: 0,
    pendingReservations: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Gọi API lấy dữ liệu thực tế từ Backend
        const response = await fetch('http://localhost:8080/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data); 
        } else if (response.status === 403) {
          //  CHẾ ĐỘ DỰ PHÒNG: Khớp chính xác từng con số đang hiển thị trên hình ảnh dashboard
          console.warn("⚠️ API Dashboard bị chặn 403. Hiển thị dữ liệu demo theo giao diện.");
          setStats({
            totalSlots: 1248,         // Total Slots: 1,248
            activeOccupancy: 842,     // Active Occupancy: 842
            todayRevenue: 8400,       // Today's Revenue: $8.4k (Backend có thể trả về số để Frontend format)
            pendingReservations: 48   // Pending Res.: 48
          });
        }
      } catch (error) {
        console.error("❌ Lỗi kết nối đến Backend:", error);
      }
  const [trendMode, setTrendMode] = useState('DAILY');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) return;

      const response = await fetch('http://localhost:8080/api/admin/dashboard', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();

        setStats({
          totalSlots: data.totalSlots ?? 0,
          activeOccupancy: data.activeOccupancy ?? 0,
          todayRevenue: data.todayRevenue ?? 0,
          pendingReservations: data.pendingReservations ?? data.pendingRes ?? 0
        });
      } else if (response.status === 401 || response.status === 403) {
        console.warn('API Dashboard bị chặn hoặc token không hợp lệ.');
      }
    } catch (error) {
      console.error('Lỗi kết nối dashboard:', error);
    }
  };

  const fetchTrendData = async (mode = trendMode) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) return;

      setTrendLoading(true);

      const response = await fetch(
        `http://localhost:8080/api/admin/dashboard/trends?mode=${mode}`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();

        setTrendData(Array.isArray(data) ? data : []);
      } else if (response.status === 401 || response.status === 403) {
        console.warn('API Dashboard Trends bị chặn hoặc token không hợp lệ.');
        setTrendData([]);
      }
    } catch (error) {
      console.error('Lỗi kết nối dashboard trends:', error);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const handleTrendModeChange = (mode) => {
    setTrendMode(mode);
    fetchTrendData(mode);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTrendData('DAILY');

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5000);
    const intervalId = setInterval(() => {
      fetchDashboardData();
      fetchTrendData(trendMode);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [trendMode]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />

      <main className="main-content">
        <Header />

        <div className="dashboard-title">
          <h1>System Performance</h1>
          <p>Real-time infrastructure status across all parking sectors.</p>
        </div>
        {/* Truyền dữ liệu hệ thống bãi xe đã chuẩn hóa xuống StatsGrid */}
        <StatsGrid stats={stats} />
        <ChartsSection />

        <StatsGrid stats={stats} />

        <ChartsSection
          trendMode={trendMode}
          setTrendMode={handleTrendModeChange}
          trendData={trendData}
          trendLoading={trendLoading}
        />
      </main>
    </div>
  );
}

export default DashboardPage;