import React from 'react';

function ChartsSection({
  trendMode = 'DAILY',
  setTrendMode,
  trendData = [],
  trendLoading = false
}) {
  const maxValue = Math.max(
    ...trendData.map((item) => Number(item.value || 0)),
    1
  );

  const getBarHeight = (value) => {
    const numericValue = Number(value || 0);

    if (numericValue === 0) {
      return '8%';
    }

    const percent = Math.round((numericValue / maxValue) * 100);

    return `${Math.max(percent, 12)}%`;
  };

  const handleChangeMode = (mode) => {
    if (setTrendMode) {
      setTrendMode(mode);
    }
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
          minHeight: '360px'
        }}
      >
        <div className="chart-header">
          <div>
            <h3>Occupancy Trends</h3>
            <p>
              {trendMode === 'DAILY'
                ? 'Daily vehicle count by 4-hour blocks for 24/7 operations'
                : 'Weekly vehicle count across all operating days'}
            </p>
          </div>

          <div className="chart-tabs">
            <button
              className={`tab-btn ${trendMode === 'DAILY' ? 'active' : ''}`}
              type="button"
              onClick={() => handleChangeMode('DAILY')}
              disabled={trendLoading}
            >
              DAILY
            </button>

            <button
              className={`tab-btn ${trendMode === 'WEEKLY' ? 'active' : ''}`}
              type="button"
              onClick={() => handleChangeMode('WEEKLY')}
              disabled={trendLoading}
            >
              WEEKLY
            </button>
          </div>
        </div>

        {trendLoading ? (
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
            Loading trend data...
          </div>
        ) : trendData.length === 0 ? (
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
            className="bar-chart-mock"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: trendMode === 'DAILY' ? '1.25rem' : '1rem',
              height: '250px',
              padding: '1rem 0 0.25rem 0',
              overflowX: 'auto'
            }}
          >
            {trendData.map((item, index) => {
              const numericValue = Number(item.value || 0);
              const isPeak = numericValue > 0 && numericValue === maxValue;

              return (
                <div
                  className="bar-wrapper"
                  key={`${item.label}-${index}`}
                  style={{
                    flex: '1',
                    minWidth: trendMode === 'DAILY' ? '130px' : '80px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                  }}
                >
                  <div
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}
                  >
                    {numericValue}
                  </div>

                  <div
                    className={`bar ${isPeak ? 'active' : ''}`}
                    style={{
                      height: getBarHeight(numericValue),
                      width: trendMode === 'DAILY' ? '44px' : '38px',
                      minHeight: '18px'
                    }}
                    title={`${item.label}: ${numericValue} vehicles`}
                  />

                  <span
                    style={{
                      marginTop: '0.75rem',
                      color: '#64748b',
                      fontSize: trendMode === 'DAILY' ? '0.72rem' : '0.78rem',
                      fontWeight: '600',
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
        )}
      </div>
    </div>
  );
}

export default ChartsSection;