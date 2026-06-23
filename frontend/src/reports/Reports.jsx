import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { 
  DollarSign, Activity, Percent, Calendar, 
  Download, FileText, Filter, MoreVertical, 
  ChevronLeft, ChevronRight, Circle 
} from "lucide-react";

const Reports = () => {
  // Chỉ giữ lại 3 khoảng thời gian theo yêu cầu: Today, Week, Month
  const [timeRange, setTimeRange] = useState("Week");
  
  const [operationalLog, setOperationalLog] = useState([
    { date: "Oct 24, 2023", sessions: 184, revenue: 6120.00, occupancy: 89, reservations: 42, notes: "Peak hours observed: 09:00 - 11:00" },
    { date: "Oct 23, 2023", sessions: 162, revenue: 5840.50, occupancy: 82, reservations: 38, notes: "System maintenance at 02:00" },
    { date: "Oct 22, 2023", sessions: 210, revenue: 7442.20, occupancy: 96, reservations: 54, notes: "Sunday Event: Local Expo" },
    { date: "Oct 21, 2023", sessions: 175, revenue: 5930.00, occupancy: 85, reservations: 40, notes: "Normal operational load" }
  ]);

  const [vehicleDistribution, setVehicleDistribution] = useState({
    car: 85,
    motorbike: 15
  });

  // Định nghĩa các mốc thời gian hiển thị dưới trục biểu đồ ứng với từng Tab được nhấp chọn
  const chartLabels = {
    Today: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"],
    Week: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    Month: ["Week 1", "Week 2", "Week 3", "Week 4"]
  };

  // ==========================================
  // TODO: API INTEGRATION - FETCH REPORT METRICS
  // ==========================================
  useEffect(() => {
    /* axios.get(`/api/reports?range=${timeRange}`).then(res => {
         setOperationalLog(res.data.logs);
         setVehicleDistribution(res.data.distribution);
      });
    */
  }, [timeRange]);

  // HÀM XUẤT CSV 
  const handleExportCSV = () => {
    const headers = ["Date", "Sessions", "Revenue ($)", "Occupancy (%)", "Reservations", "Notes"];
    const rows = operationalLog.map(log => [
      log.date, log.sessions, log.revenue.toFixed(2), `${log.occupancy}%`, log.reservations, log.notes
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `System_Performance_Report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    console.log("Trigger PDF report output generation.");
  };

  return (
    <div className="dashboard-layout" style={{ display: "flex", background: "#060b13", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Header />

        {/* Title Area & Top Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.75rem", margin: "0" }}>System Performance Reports</h1>
            <p style={{ color: "#64748b", margin: "0.5rem 0 0 0" }}>Aggregated operational metrics for all parking facilities.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: "#0c1322", border: "1px solid #1e293b", borderRadius: "0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>
              <Download size={16} /> Export CSV
            </button>
            <button onClick={handleExportPDF} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: "#3b82f6", border: "none", borderRadius: "0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Time Range Filter Bar (ĐÃ XÓA PHẦN LIVE SYSTEM HEALTHY VÀ NÚT CUSTOM) */}
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", background: "#0c1322", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #1e293b", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: "bold", marginRight: "0.5rem" }}>TIME RANGE</span>
            {["Today", "Week", "Month"].map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeRange(tab)}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "0.375rem", border: "none",
                  background: timeRange === tab ? "#1e293b" : "transparent",
                  color: timeRange === tab ? "#fff" : "#64748b",
                  cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>TOTAL REVENUE</span>
            <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0 0 0", color: "#fff" }}>$42,910</p>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "#1e293b", padding: "0.5rem", borderRadius: "0.5rem", color: "#64748b" }}>
              <DollarSign size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>TOTAL SESSIONS</span>
            <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0 0 0", color: "#fff" }}>1,284</p>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "#1e293b", padding: "0.5rem", borderRadius: "0.5rem", color: "#64748b" }}>
              <Activity size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>AVG OCCUPANCY</span>
            <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0 0 0", color: "#fff" }}>84.2%</p>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "#1e293b", padding: "0.5rem", borderRadius: "0.5rem", color: "#64748b" }}>
              <Percent size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>RESERVATIONS</span>
            <p style={{ fontSize: "2rem", fontWeight: "bold", margin: "0.5rem 0 0 0", color: "#fff" }}>342</p>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "#1e293b", padding: "0.5rem", borderRadius: "0.5rem", color: "#64748b" }}>
              <Calendar size={20} />
            </div>
          </div>
        </div>

        {/* Layout Split: Performance Chart & Vehicle Distribution */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          
          {/* Revenue Performance Section */}
          <div style={{ background: "#0c1322", borderRadius: "0.75rem", border: "1px solid #1e293b", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>Revenue Performance</h3>
                <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Daily earnings across all payment methods</span>
              </div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", fontWeight: "600" }}>
                <span style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "0.35rem" }}><Circle size={6} fill="#3b82f6" /> CURRENT</span>
                <span style={{ color: "#1e293b", display: "flex", alignItems: "center", gap: "0.35rem" }}><Circle size={6} fill="#1e293b" /> PREVIOUS</span>
              </div>
            </div>

            {/* Mock Chart Area - Các nhãn trục X sẽ tự cập nhật động tương ứng với State timeRange */}
            <div style={{ flex: 1, minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", padding: "10px 0" }}>
              {[1, 2, 3, 4].map((_, i) => <div key={i} style={{ width: "100%", height: "1px", background: "#1e293b" }}></div>)}
              
              {/* Vùng Render Trục X Động theo Ngày/Tuần/Tháng */}
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.75rem", fontWeight: "bold", paddingTop: "0.5rem" }}>
                {chartLabels[timeRange].map((label, idx) => (
                  <span key={idx}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicle Distribution Section */}
          <div style={{ background: "#0c1322", borderRadius: "0.75rem", border: "1px solid #1e293b", padding: "1.5rem" }}>
            <h3 style={{ color: "#fff", margin: "0 0 1.5rem 0", fontSize: "1.1rem" }}>Vehicle Distribution</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#94a3b8" }}>Standard Cars</span>
                  <span>{vehicleDistribution.car}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${vehicleDistribution.car}%`, height: "100%", background: "#3b82f6", borderRadius: "4px" }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#94a3b8" }}>Motorcycles / Motorbikes</span>
                  <span>{vehicleDistribution.motorbike}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${vehicleDistribution.motorbike}%`, height: "100%", background: "#10b981", borderRadius: "4px" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Log Table Section */}
        <div style={{ background: "#0c1322", borderRadius: "0.75rem", border: "1px solid #1e293b", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e293b" }}>
            <h3 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>Daily Operational Log</h3>
            <div style={{ display: "flex", gap: "0.5rem", color: "#64748b" }}>
              <button style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}><Filter size={18} /></button>
              <button style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}><MoreVertical size={18} /></button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem 1.5rem" }}>DATE</th>
                <th style={{ padding: "1rem" }}>SESSIONS</th>
                <th style={{ padding: "1rem" }}>REVENUE</th>
                <th style={{ padding: "1rem" }}>OCCUPANCY</th>
                <th style={{ padding: "1rem" }}>RESERVATIONS</th>
                <th style={{ padding: "1rem" }}>NOTES</th>
                <th style={{ padding: "1rem 1.5rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {operationalLog.map((log, index) => {
                const isHighOccupancy = log.occupancy >= 95;
                return (
                  <tr key={index} style={{ borderBottom: "1px solid #1e293b", color: "#fff", fontSize: "0.9rem" }}>
                    <td style={{ padding: "1rem 1.5rem", fontWeight: "600" }}>{log.date}</td>
                    <td style={{ padding: "1rem", color: "#10b981", fontWeight: "600" }}>{log.sessions}</td>
                    <td style={{ padding: "1rem", fontWeight: "600" }}>${log.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>{log.occupancy}%</span>
                        <div style={{ width: "60px", height: "6px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${log.occupancy}%`, height: "100%", background: isHighOccupancy ? "#ef4444" : "#10b981" }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>{log.reservations}</td>
                    <td style={{ padding: "1rem", color: "#64748b", fontSize: "0.85rem" }}>{log.notes}</td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <button style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>
                        DETAILS
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Footer controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid #1e293b" }}>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Showing 4 of 30 days</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button style={{ background: "#0c1322", border: "1px solid #1e293b", color: "#64748b", padding: "0.4rem 0.6rem", borderRadius: "0.375rem", cursor: "not-allowed" }} disabled><ChevronLeft size={16} /></button>
              <button style={{ background: "#3b82f6", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.85rem", fontWeight: "bold" }}>1</button>
              <button style={{ background: "#0c1322", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.85rem" }}>2</button>
              <button style={{ background: "#0c1322", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.85rem" }}>3</button>
              <button style={{ background: "#0c1322", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem 0.6rem", borderRadius: "0.375rem", cursor: "pointer" }}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Reports;