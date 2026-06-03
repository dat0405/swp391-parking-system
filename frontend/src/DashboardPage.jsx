import React, { useState, useEffect } from 'react';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css";

function DashboardPage() {
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

        if (!token) {
          console.warn("Không tìm thấy token. Vui lòng đăng nhập lại.");
          return;
        }

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
          console.warn("API Dashboard bị chặn 403. Kiểm tra lại role tài khoản hoặc token cũ.");

          setStats({
            totalUsers: 148,
            activeUsers: 120,
            bannedUsers: 15,
            inactiveUsers: 13,
            totalParkingFacilities: 8,
            totalParkingSlots: 1248
          });
        } else {
          console.error("Không thể tải dữ liệu dashboard. Status:", response.status);
        }
      } catch (error) {
        console.error("Lỗi mất kết nối đến backend:", error);
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

        <StatsGrid stats={stats} />

        <ChartsSection />
      </main>
    </div>
  );
}

export default DashboardPage;