import React from 'react';

function ChartsSection() {
  return (
    <div className="charts-grid">
      {/* OCCUPANCY TRENDS GRAPH */}
      <div className="chart-card main-chart">
        <div className="chart-header">
          <div>
            <h3>Occupancy Trends</h3>
            <p>Real-time vehicle flow monitoring</p>
          </div>
          <div className="chart-tabs">
            <button className="tab-btn active" type="button">DAILY</button>
            <button className="tab-btn" type="button">WEEKLY</button>
          </div>
        </div>
        <div className="bar-chart-mock">
          <div className="bar-wrapper"><div className="bar" style={{ height: '40%' }}></div><span>08 AM</span></div>
          <div className="bar-wrapper"><div className="bar" style={{ height: '65%' }}></div><span>10 AM</span></div>
          <div className="bar-wrapper"><div className="bar active" style={{ height: '90%' }}></div><span>12 PM</span></div>
          <div className="bar-wrapper"><div className="bar" style={{ height: '80%' }}></div><span>02 PM</span></div>
          <div className="bar-wrapper"><div className="bar" style={{ height: '55%' }}></div><span>04 PM</span></div>
          <div className="bar-wrapper"><div className="bar" style={{ height: '30%' }}></div><span>06 PM</span></div>
        </div>
      </div>

      {/* SLOT ALLOCATION GRAPH */}
      <div className="chart-card side-chart">
        <h3>Slot Allocation</h3>
        <div className="donut-chart-mock">
          <div className="donut-hole">
            <h2>1.2k</h2>
            <span>CAP.</span>
          </div>
        </div>
        <div className="legend-list">
          <div className="legend-item">
            <span className="dot available"></span> <span>Available</span>
            <strong className="legend-val">406</strong>
          </div>
          <div className="legend-item">
            <span className="dot occupied"></span> <span>Occupied</span>
            <strong className="legend-val">842</strong>
          </div>
          <div className="legend-item">
            <span className="dot maintenance"></span> <span>Maintenance</span>
            <strong className="legend-val">24</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartsSection;