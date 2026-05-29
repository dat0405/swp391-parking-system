import React, { useState, useEffect } from 'react';

import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import "./dashboard/DashboardPage.css";

function DashboardPage() {
  const fullName = localStorage.getItem('fullName');
  const role = localStorage.getItem('role');

  const [stats, setStats] = useState({
    totalSlots: 0,
    activeOccupancy: 0,
    todayRevenue: 0,
    pendingRes: 0,
    health: 0,
    utilization: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setTimeout(() => {
          setStats({
            totalSlots: 1248,
            activeOccupancy: 842,
            todayRevenue: 8400,
            pendingRes: 48,
            health: 85,
            utilization: 67
          });
        }, 4000);
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