import React from 'react';

function ChartsSection({
  trendMode = 'DAILY',
  setTrendMode,
  trendData = []
}) {
  const normalizedTrendData = Array.isArray(trendData) ? trendData : [];

  const defaultDailyBlocks = [
    { label: '00-04', value: 0 },
    { label: '04-08', value: 0 },
    { label: '08-12', value: 0 },
    { label: '12-16', value: 0 },
    { label: '16-20', value: 0 },
    { label: '20-24', value: 0 }
  ];

  const chartData =
    trendMode === 'DAILY' && normalizedTrendData.length === 0
      ? defaultDailyBlocks
      : normalizedTrendData;

  const hasChartData = chartData.length > 0;

  const totalVehicles = chartData.reduce((total, item) => {
    return total + Number(item.value || 0);
  }, 0);

  const maxValue = Math.max(
    ...chartData.map((item) => Number(item.value || 0)),
    1
  );

  const hasVehicleActivity = totalVehicles > 0;

  const peakItem = hasVehicleActivity
    ? chartData.reduce((peak, item) => {
        const currentValue = Number(item.value || 0);
        const peakValue = Number(peak.value || 0);

        return currentValue > peakValue ? item : peak;
      }, chartData[0])
    : null;

  const getBarHeight = (value) => {
    const numericValue = Number(value || 0);

    if (numericValue === 0) {
      return '8%';
    }

    const percent = Math.round((numericValue / maxValue) * 100);

    return `${Math.max(percent, 18)}%`;
  };

  const getFullTimeLabel = (label) => {
    if (label === '00-04') return '00:00 - 04:00';
    if (label === '04-08') return '04:00 - 08:00';
    if (label === '08-12') return '08:00 - 12:00';
    if (label === '12-16') return '12:00 - 16:00';
    if (label === '16-20') return '16:00 - 20:00';
    if (label === '20-24') return '20:00 - 24:00';

    return label;
  };

  const handleChangeMode = (mode) => {
    if (setTrendMode && mode !== trendMode) {
      setTrendMode(mode);
    }
  };

  const getDescription = () => {
    if (trendMode === 'DAILY') {
      return 'Vehicle check-ins grouped into 4-hour blocks across a full 24-hour day.';
    }

    return 'Weekly vehicle count across all operating days.';
  };

  return (
    <div
      className="charts-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
        width: '100%'
      }}
    >
      <div
        className="chart-card main-chart"
        style={{
          width: '100%',
          minHeight: '390px'
        }}
      >
        <div className="chart-header">
          <div>
            <h3>Occupancy Trends</h3>
            <p>{getDescription()}</p>
          </div>

          <div className="chart-tabs">
            <button
              className={`tab-btn ${trendMode === 'DAILY' ? 'active' : ''}`}
              type="button"
              onClick={() => handleChangeMode('DAILY')}
            >
              DAILY
            </button>

            <button
              className={`tab-btn ${trendMode === 'WEEKLY' ? 'active' : ''}`}
              type="button"
              onClick={() => handleChangeMode('WEEKLY')}
            >
              WEEKLY
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '0.75rem',
            marginBottom: '0.5rem'
          }}
        >
          <div
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            Total {trendMode === 'DAILY' ? 'today' : 'this week'}: {totalVehicles} vehicles
          </div>

          <div
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: hasVehicleActivity
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(148, 163, 184, 0.1)',
              border: hasVehicleActivity
                ? '1px solid rgba(34, 197, 94, 0.2)'
                : '1px solid rgba(148, 163, 184, 0.2)',
              color: hasVehicleActivity ? '#86efac' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            Peak: {peakItem ? getFullTimeLabel(peakItem.label) : 'No activity'}
          </div>
        </div>

        {!hasChartData ? (
          <div
            style={{
              height: '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}
          >
            No trend data available.
          </div>
        ) : (
          <div
            style={{
              position: 'relative'
            }}
          >
            {!hasVehicleActivity && (
              <div
                style={{
                  position: 'absolute',
                  top: '42%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              >
                <div
                  style={{
                    color: '#e2e8f0',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    marginBottom: '0.25rem'
                  }}
                >
                  No vehicle activity recorded {trendMode === 'DAILY' ? 'today' : 'this week'}
                </div>

                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.78rem'
                  }}
                >
                  Once vehicles check in, occupancy trends will appear here.
                </div>
              </div>
            )}

            <div
              className="bar-chart-mock"
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: trendMode === 'DAILY' ? '1rem' : '1rem',
                height: '250px',
                padding: '1rem 0 0.25rem 0',
                overflowX: 'auto',
                opacity: hasVehicleActivity ? 1 : 0.45
              }}
            >
              {chartData.map((item, index) => {
                const numericValue = Number(item.value || 0);
                const isPeak = hasVehicleActivity && numericValue === maxValue;

                return (
                  <div
                    className="bar-wrapper"
                    key={`${item.label}-${index}`}
                    style={{
                      flex: '1',
                      minWidth: trendMode === 'DAILY' ? '95px' : '80px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end'
                    }}
                  >
                    <div
                      style={{
                        color: numericValue > 0 ? '#e2e8f0' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem'
                      }}
                    >
                      {numericValue}
                    </div>

                    <div
                      className={`bar ${isPeak ? 'active' : ''}`}
                      style={{
                        height: getBarHeight(numericValue),
                        width: trendMode === 'DAILY' ? '42px' : '38px',
                        minHeight: '18px'
                      }}
                      title={`${getFullTimeLabel(item.label)}: ${numericValue} vehicles`}
                    />

                    <span
                      style={{
                        marginTop: '0.75rem',
                        color: '#64748b',
                        fontSize: trendMode === 'DAILY' ? '0.76rem' : '0.78rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartsSection;