import React, { useEffect, useState } from 'react';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import StatsGrid from './dashboard/StatsGrid';
import ChartsSection from './dashboard/ChartsSection';
import axiosClient from './api/axiosClient';
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

  const fetchDashboardData = async () => {
    try {
      const response = await axiosClient.get('/admin/dashboard');
      const data = response.data;

      setStats({
        totalSlots: data.totalSlots ?? 0,
        activeOccupancy: data.activeOccupancy ?? 0,
        todayRevenue: data.todayRevenue ?? 0,
        pendingReservations: data.pendingReservations ?? data.pendingRes ?? 0
      });
    } catch (error) {
      console.error('Lỗi kết nối dashboard:', error);
    }
  };

  const fetchTrendData = async (mode = trendMode) => {
    try {
      setTrendLoading(true);

      const response = await axiosClient.get('/admin/dashboard/trends', {
        params: {
          mode
        }
      });

      const data = response.data;

      setTrendData(Array.isArray(data) ? data : []);
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
    fetchTrendData(trendMode);

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