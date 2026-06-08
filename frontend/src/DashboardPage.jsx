import React, { useState, useEffect } from 'react';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import './dashboard/DashboardPage.css';

function DashboardPage() {
  const [stats, setStats] = useState({
    totalSlots: 0,
    activeOccupancy: 0,
    todayRevenue: 0,
    pendingReservations: 0
  });

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

        <div className="dashboard-title">
          <h1>System Performance</h1>
          <p>Real-time infrastructure status across all parking sectors.</p>
        </div>

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