import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { 
  Calendar, Car, CheckCircle2, XCircle, 
  Search, Download, Edit2, Trash2, Eye, 
  ChevronLeft, ChevronRight, AlertTriangle 
} from "lucide-react";

const ReservationAdmin = () => {
  // 1. DATA ARRAY
  const [reservations, setReservations] = useState([
    {
      id: "#RES-9402",
      customer: { name: "John Dorsey", email: "j.dorsey@example.com" },
      plate: "ABC-1234",
      slot: "Floor 2, A-42",
      schedule: { date: "Oct 24", time: "08:00 AM", end: "Ends 05:00 PM" },
      status: "Active"
    },
    {
      id: "#RES-9398",
      customer: { name: "Maria Lopez", email: "m.lopez@cloud.net" },
      plate: "XYZ-7890",
      slot: "Floor 1, B-12",
      schedule: { date: "Oct 24", time: "10:30 AM", end: "Ends 02:30 PM" },
      status: "Pending"
    },
    {
      id: "#RES-9382",
      customer: { name: "Sam Taylor", email: "sam.t@company.com" },
      plate: "GHT-5544",
      slot: "Floor 3, C-05",
      schedule: { date: "Oct 23", time: "09:00 AM", end: "Ended 06:00 PM" },
      status: "Completed"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  // State quản lý việc hiển thị Modal xác nhận hủy phòng đẹp hơn thay vì window.confirm
  const [reservationToCancel, setReservationToCancel] = useState(null);

  // ==========================================
  // TODO: API INTEGRATION - FETCH RESERVATIONS
  // ==========================================
  useEffect(() => {
    /* axios.get('/api/reservations').then(res => {
        setReservations(res.data);
      });
    */
  }, []);

  // 2. FILTER DATA LOGIC
  const filteredData = reservations.filter(item => {
    const matchesSearch = 
      item.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 3. PAGINATION LOGIC
  const totalPages = Math.ceil(filteredData.length / itemsPerPage); 
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // 4. FUNCTION EXPORT TO CSV
  const handleExportCSV = () => {
    const headers = ["Reservation ID", "Customer Name", "Customer Email", "Vehicle Plate", "Slot Location", "Date", "Start Time", "End Time", "Status"];
    const rows = filteredData.map(item => [
      item.id, item.customer.name, item.customer.email, item.plate, item.slot, item.schedule.date, item.schedule.time, item.schedule.end, item.status
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reservations_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. CONFIRMED EXECUTING CANCELATION FROM CUSTOM MODAL
  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return;
    
    // ==========================================
    // TODO: API INTEGRATION - CANCEL REQUEST (PUT/POST)
    // ==========================================
    /* try {
        await axios.put(`/api/reservations/cancel/${reservationToCancel.id}`);
      } catch(err) { console.error(err); }
    */

    setReservations(prev => 
      prev.map(item => item.id === reservationToCancel.id ? { ...item, status: "Cancelled" } : item)
    );
    
    // Tắt modal sau khi xử lý xong
    setReservationToCancel(null);
  };

  return (
    <div className="dashboard-layout" style={{ display: "flex", background: "#060b13", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Header />

        {/* Description Area */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ color: "#64748b", margin: "0" }}>Monitor and control all vehicle bookings across the facility.</p>
        </div>

        {/* Stats Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>TOTAL RESERVATIONS</span>
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0", color: "#fff" }}>1,284</p>
            <span style={{ fontSize: "0.75rem", color: "#10b981" }}>↗ 12% from last month</span>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "#1e293b", padding: "0.5rem", borderRadius: "0.5rem", color: "#64748b" }}>
              <Calendar size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>ACTIVE NOW</span>
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0", color: "#fff" }}>432</p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>92% occupancy in Zone A</span>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(16, 185, 129, 0.1)", padding: "0.5rem", borderRadius: "0.5rem", color: "#10b981" }}>
              <Car size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>COMPLETED</span>
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0", color: "#fff" }}>812</p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Avg duration: 4.5 hrs</span>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(59, 130, 246, 0.1)", padding: "0.5rem", borderRadius: "0.5rem", color: "#3b82f6" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #1e293b", position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>CANCELLED</span>
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0", color: "#fff" }}>40</p>
            <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>↘ Reduced by 5%</span>
            <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem", borderRadius: "0.5rem", color: "#ef4444" }}>
              <XCircle size={20} />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1 }}>
            <div style={{ position: "relative", width: "300px" }}>
              <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                placeholder="Filter by Name or Plate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "0.6rem 0.6rem 0.6rem 2.25rem", borderRadius: "0.5rem",
                  border: "1px solid #1e293b", background: "#0c1322", color: "#fff", fontSize: "0.9rem"
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.6rem 1rem", borderRadius: "0.5rem", border: "1px solid #1e293b",
                background: "#0c1322", color: "#fff", cursor: "pointer", fontSize: "0.9rem"
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Action Elements - CSV Only */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              title="Export Report to CSV" 
              onClick={handleExportCSV}
              style={{ 
                padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #1e293b", 
                background: "#0c1322", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" 
              }}
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div style={{ background: "#0c1322", borderRadius: "0.75rem", border: "1px solid #1e293b", overflow: "hidden", marginBottom: "1.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem" }}>ID</th>
                <th style={{ padding: "1rem" }}>Customer</th>
                <th style={{ padding: "1rem" }}>Vehicle Plate</th>
                <th style={{ padding: "1rem" }}>Slot</th>
                <th style={{ padding: "1rem" }}>Schedule</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row) => {
                let badgeStyle = { background: "rgba(16, 185, 129, 0.1)", color: "#10b981" };
                if (row.status === "Pending") badgeStyle = { background: "rgba(147, 51, 234, 0.1)", color: "#a855f7" };
                if (row.status === "Completed") badgeStyle = { background: "rgba(100, 116, 139, 0.1)", color: "#94a3b8" };
                if (row.status === "Cancelled") badgeStyle = { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" };

                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid #1e293b", color: "#fff", fontSize: "0.9rem" }}>
                    <td style={{ padding: "1rem", color: "#64748b", fontWeight: "600" }}>{row.id}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", color: "#3b82f6" }}>
                          {row.customer.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: "600" }}>{row.customer.name}</p>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{row.customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ background: "#1e293b", padding: "0.3rem 0.6rem", borderRadius: "0.375rem", fontSize: "0.8rem", letterSpacing: "0.5px" }}>
                        {row.plate}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", color: "#e2e8f0" }}>{row.slot}</td>
                    <td style={{ padding: "1rem" }}>
                      <p style={{ margin: 0, fontWeight: "600" }}>{row.schedule.date}, <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{row.schedule.time}</span></p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{row.schedule.end}</p>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ padding: "0.25rem 0.6rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: "bold", ...badgeStyle }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", color: "#64748b" }}>
                        {row.status === "Completed" || row.status === "Cancelled" ? (
                          <button title="View Detail" style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
                            <Eye size={16} />
                          </button>
                        ) : (
                          <>
                            <button title="Edit Schedule" style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
                              <Edit2 size={16} />
                            </button>
                            <button 
                              title="Cancel Reservation" 
                              onClick={() => setReservationToCancel(row)} // Bật modal UI xịn thay vì window prompt
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Navigation Pagination Section (> 5 data) */}
        {filteredData.length > itemsPerPage && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ 
                  background: "#0c1322", border: "1px solid #1e293b", color: "#fff", 
                  padding: "0.5rem 0.75rem", borderRadius: "0.375rem", 
                  cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "0.85rem" 
                }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    background: currentPage === page ? "#3b82f6" : "#0c1322",
                    border: "1px solid #1e293b",
                    color: "#fff", padding: "0.5rem 0.75rem", borderRadius: "0.375rem",
                    cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ 
                  background: "#0c1322", border: "1px solid #1e293b", color: "#fff", 
                  padding: "0.5rem 0.75rem", borderRadius: "0.375rem", 
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: "0.85rem" 
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* CUSTOM CONFIRMATION MODAL - ĐẸP VÀ ĐỒNG BỘ THEO DESIGN CHUẨN */}
        {/* ============================================================= */}
        {reservationToCancel && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(3, 7, 18, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", padding: "2rem", borderRadius: "0.75rem", width: "420px", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}>
              
              {/* Warning Header Icon */}
              <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
                <AlertTriangle size={28} />
              </div>
              
              {/* Modal Context */}
              <h3 style={{ color: "#fff", margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: "600" }}>Cancel Reservation</h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 2rem 0", lineHeight: "1.5" }}>
                Are you sure you want to cancel reservation <span style={{ color: "#fff", fontWeight: "bold" }}>{reservationToCancel.id}</span> for <span style={{ color: "#fff", fontWeight: "bold" }}>{reservationToCancel.customer.name}</span>? This action cannot be undone.
              </p>

              {/* Handle Execution Buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button 
                  onClick={() => setReservationToCancel(null)} // Cancel Close
                  style={{ flex: 1, padding: "0.65rem", background: "transparent", color: "#94a3b8", border: "1px solid #1e293b", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
                >
                  No, Keep It
                </button>
                <button 
                  onClick={confirmCancelReservation} // Confirm Delete/Cancel
                  style={{ flex: 1, padding: "0.65rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
                >
                  Yes, Cancel
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ReservationAdmin;