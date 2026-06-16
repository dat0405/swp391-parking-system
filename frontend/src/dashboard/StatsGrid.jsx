import React from 'react';
import { Grid, Car, Banknote, Bookmark } from 'lucide-react';

function StatsGrid({ stats }) {
  const {
    totalSlots = 0,
    activeOccupancy = 0,
    todayRevenue = 0,
    pendingReservations = 0
  } = stats || {};

  const formatVnd = (value) => {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  };

  const formatShortVnd = (value) => {
    const numberValue = Number(value || 0);

    if (numberValue >= 1000000000) {
      return `${(numberValue / 1000000000).toFixed(1)}B VND`;
    }

    if (numberValue >= 1000000) {
      return `${(numberValue / 1000000).toFixed(1)}M VND`;
    }

    if (numberValue >= 1000) {
      return `${(numberValue / 1000).toFixed(0)}K VND`;
    }

    return formatVnd(numberValue);
  };

  const utilizationRate =
    totalSlots > 0 ? Math.round((activeOccupancy / totalSlots) * 100) : 0;

  const availableSlots = Math.max(Number(totalSlots || 0) - Number(activeOccupancy || 0), 0);

  const getOccupancyStatus = () => {
    if (totalSlots <= 0) return 'No slot data';
    if (utilizationRate >= 90) return 'Near full';
    if (utilizationRate >= 70) return 'High usage';
    if (utilizationRate >= 40) return 'Moderate usage';
    if (activeOccupancy > 0) return 'Low usage';

    return 'Empty now';
  };

  const getRevenueStatus = () => {
    if (Number(todayRevenue || 0) > 0) {
      return 'Collected today';
    }

    return 'No revenue yet';
  };

  const getReservationStatus = () => {
    if (Number(pendingReservations || 0) > 0) {
      return `${Number(pendingReservations).toLocaleString('vi-VN')} pending`;
    }

    return 'No pending';
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}
    >
      <div
        className="stat-card"
        style={{
          backgroundColor: '#131722',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              color: '#60a5fa',
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
          >
            <Grid size={20} />
          </div>

          <span
            style={{
              color: '#93c5fd',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem'
            }}
          >
            Live data
          </span>
        </div>

        <span
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.05em'
          }}
        >
          TOTAL SLOTS
        </span>

        <h2
          style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0.25rem 0 0.75rem 0'
          }}
        >
          {Number(totalSlots || 0).toLocaleString('vi-VN')}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: '#334155',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${Math.min(utilizationRate, 100)}%`,
                height: '100%',
                backgroundColor: '#60a5fa'
              }}
            />
          </div>

          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            {availableSlots} available
          </span>
        </div>
      </div>

      <div
        className="stat-card"
        style={{
          backgroundColor: '#131722',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              color: '#4ade80',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
          >
            <Car size={20} />
          </div>

          <span
            style={{
              color: utilizationRate >= 90 ? '#ef4444' : '#4ade80',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor:
                utilizationRate >= 90
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(74, 222, 128, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem'
            }}
          >
            {getOccupancyStatus()}
          </span>
        </div>

        <span
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.05em'
          }}
        >
          ACTIVE OCCUPANCY
        </span>

        <h2
          style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0.25rem 0 0.75rem 0'
          }}
        >
          {Number(activeOccupancy || 0).toLocaleString('vi-VN')}
        </h2>

        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {utilizationRate}% utilization across all slots
        </div>
      </div>

      <div
        className="stat-card"
        style={{
          backgroundColor: '#131722',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              color: '#fb923c',
              backgroundColor: 'rgba(251, 146, 60, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
          >
            <Banknote size={20} />
          </div>

          <span
            style={{
              color: Number(todayRevenue || 0) > 0 ? '#4ade80' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor:
                Number(todayRevenue || 0) > 0
                  ? 'rgba(74, 222, 128, 0.1)'
                  : 'rgba(148, 163, 184, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem'
            }}
          >
            {getRevenueStatus()}
          </span>
        </div>

        <span
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.05em'
          }}
        >
          TODAY&apos;S REVENUE
        </span>

        <h2
          style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0.25rem 0 0.75rem 0'
          }}
        >
          {formatShortVnd(todayRevenue)}
        </h2>

        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Actual collected revenue today
        </div>
      </div>

      <div
        className="stat-card"
        style={{
          backgroundColor: '#131722',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              color: '#818cf8',
              backgroundColor: 'rgba(129, 140, 248, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
          >
            <Bookmark size={20} />
          </div>

          <span
            style={{
              color: Number(pendingReservations || 0) > 0 ? '#fb923c' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor:
                Number(pendingReservations || 0) > 0
                  ? 'rgba(251, 146, 60, 0.1)'
                  : 'rgba(148, 163, 184, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem'
            }}
          >
            {getReservationStatus()}
          </span>
        </div>

        <span
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.05em'
          }}
        >
          PENDING RES.
        </span>

        <h2
          style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0.25rem 0 0.75rem 0'
          }}
        >
          {Number(pendingReservations || 0).toLocaleString('vi-VN')}
        </h2>

        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Pending reservations from backend
        </div>
      </div>
    </div>
  );
}

export default StatsGrid;