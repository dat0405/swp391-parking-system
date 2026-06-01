import React, { useState, useEffect } from 'react';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css";

function DashboardPage() {
  const fullName = localStorage.getItem('fullName');
  const role = localStorage.getItem('role');

  const [stats, setStats] = useState({
    totalSlots: 1248,
    activeOccupancy: 842,
    todayRevenue: 8400,
    pendingRes: 48,
    health: 85,
    utilization: 67
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Sau này thay bằng API thật:
        // const response = await fetch('http://localhost:8080/api/dashboard/stats');
        // const data = await response.json();
        // setStats(data);

        setStats(prev => ({
          ...prev,
          activeOccupancy: Math.floor(Math.random() * (860 - 830) + 830),
          todayRevenue: prev.todayRevenue + Math.floor(Math.random() * 50)
        }));
      } catch (error) {
        console.error("Lỗi khi kết nối API Backend bãi xe:", error);
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
        <Header fullName={fullName} role={role} />

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