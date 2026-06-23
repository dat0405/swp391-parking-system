import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
// Import icons from your preferred library (e.g., lucide-react)
import { Car, Clock, Wrench, ChevronLeft, ChevronRight } from "lucide-react";

const ParkingManagement = () => {
  // 1. FIXED 100 SLOTS GENERATOR (G: 1-40, A1: 41-70, A2: 71-100)
  const generateInitialSlots = () => {
    const slots = [];
    // Floor G: Motorbike (40 slots: G-001 to G-040)
    for (let i = 1; i <= 40; i++) {
      slots.push({
        id: `G-${String(i).padStart(3, "0")}`,
        floor: "G",
        type: "motorbike",
        status: "available", // Statuses: available, occupied, reserved, maintenance
        info: "Available",
      });
    }
    // Floor A1: Car (30 slots: A1-041 to A1-070)
    for (let i = 41; i <= 70; i++) {
      slots.push({
        id: `A1-${String(i).padStart(3, "0")}`,
        floor: "A1",
        type: "car",
        status: "available",
        info: "Available",
      });
    }
    // Floor A2: Car (30 slots: A2-071 to A2-100)
    for (let i = 71; i <= 100; i++) {
      slots.push({
        id: `A2-${String(i).padStart(3, "0")}`,
        floor: "A2",
        type: "car",
        status: "available",
        info: "Available",
      });
    }
    return slots;
  };

  const [slotsData, setSlotsData] = useState(generateInitialSlots());
  const [selectedFloor, setSelectedFloor] = useState("G"); 
  const [currentPage, setCurrentPage] = useState(1);
  const slotsPerPage = 8; // Displays exactly 8 slots per view

  // Modal & Input States
  const [editingSlot, setEditingSlot] = useState(null);
  const [manualLicensePlate, setManualLicensePlate] = useState("");

  // ==========================================
  // TODO: API INTEGRATION - INITIAL FETCH & REAL-TIME CHECK-IN
  // ==========================================
  useEffect(() => {
    /* exampleApiCall().then(data => setSlotsData(data));
      
      If you are using WebSockets (Socket.io) for real-time check-in updates, 
      you can listen to the event here:
      
      socket.on("parking-update", (updatedSlot) => {
         setSlotsData(prev => prev.map(s => s.id === updatedSlot.id ? updatedSlot : s));
      });
    */
  }, []);

  // 2. FILTER SLOTS BY FLOOR
  const filteredSlots = slotsData.filter((slot) => slot.floor === selectedFloor);

  // 3. PAGINATION LOGIC (8 SLOTS PER PAGE)
  const totalPages = Math.ceil(filteredSlots.length / slotsPerPage);
  const indexOfLastSlot = currentPage * slotsPerPage;
  const indexOfFirstSlot = indexOfLastSlot - slotsPerPage;
  const currentSlots = filteredSlots.slice(indexOfFirstSlot, indexOfLastSlot);

  const handleFloorChange = (floor) => {
    setSelectedFloor(floor);
    setCurrentPage(1);
  };

  // 4. MANUAL OVERRIDE LOGIC (4 STATUSES)
  const handleUpdateStatus = async (statusType) => {
    let updatedInfo = "";
    if (statusType === "occupied") updatedInfo = manualLicensePlate || "Occupied";
    if (statusType === "available") updatedInfo = "Available";
    if (statusType === "reserved") updatedInfo = "VIP Reserved";
    if (statusType === "maintenance") updatedInfo = "Sensor Outage";

    // ==========================================
    // TODO: API INTEGRATION - UPDATE SLOT STATUS (PUT/POST REQUEST)
    // ==========================================
    /*
      try {
        await axios.put(`/api/slots/${editingSlot.id}`, { status: statusType, info: updatedInfo });
      } catch (error) {
        console.error("Failed to update slot status", error);
      }
    */

    // Local State Fallback (updates immediately on screen)
    setSlotsData((prevSlots) =>
      prevSlots.map((slot) => {
        if (slot.id === editingSlot.id) {
          return { ...slot, status: statusType, info: updatedInfo };
        }
        return slot;
      })
    );

    // Reset Modal
    setEditingSlot(null);
    setManualLicensePlate("");
  };

  // Real-time Statistics Calculation
  const stats = {
    total: slotsData.length,
    available: slotsData.filter((s) => s.status === "available").length,
    occupied: slotsData.filter((s) => s.status === "occupied").length,
    reserved: slotsData.filter((s) => s.status === "reserved").length,
    maintenance: slotsData.filter((s) => s.status === "maintenance").length,
  };

  return (
    <div className="dashboard-layout" style={{ display: "flex", background: "#060b13", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Header />

        {/* Title Area */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: "#fff", fontSize: "1.75rem", margin: "0" }}>Parking Floors & Slots</h1>
          <p style={{ color: "#64748b", margin: "0.5rem 0" }}>Live system management for 100 fixed parking structures.</p>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "TOTAL SLOTS", val: stats.total, color: "#fff" },
            { label: "AVAILABLE", val: stats.available, color: "#10b981" },
            { label: "OCCUPIED", val: stats.occupied, color: "#ef4444" },
            { label: "RESERVED", val: stats.reserved, color: "#f59e0b" },
            { label: "MAINTENANCE", val: stats.maintenance, color: "#64748b" },
          ].map((item, idx) => (
            <div key={idx} style={{ background: "#0c1322", padding: "1.2rem", borderRadius: "0.75rem", border: "1px solid #1e293b" }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold" }}>{item.label}</span>
              <p style={{ fontSize: "1.6rem", fontWeight: "bold", margin: "0.5rem 0 0 0", color: item.color }}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Floor Filters & Navigation Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "G", name: "Floor G (Motorbike)" },
              { id: "A1", name: "Floor A1 (Car)" },
              { id: "A2", name: "Floor A2 (Car)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFloorChange(f.id)}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #1e293b",
                  background: selectedFloor === f.id ? "#3b82f6" : "#131c2e",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "0.2s",
                }}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Pagination UI Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={{ background: "#131c2e", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem", borderRadius: "0.375rem", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{ background: "#131c2e", border: "1px solid #1e293b", color: "#fff", padding: "0.4rem", borderRadius: "0.375rem", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic Slots Grid (Strict 4x2 Display Layout) */}
        <div className="slots-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {currentSlots.map((slot) => {
            let statusIcon = <span style={{ fontSize: "1.5rem", color: "#334155", fontWeight: "bold" }}>P</span>;
            let statusColor = "#10b981"; // Available (Green)

            if (slot.status === "occupied") {
              statusIcon = <Car size={32} />;
              statusColor = "#ef4444"; // Occupied (Red)
            } else if (slot.status === "reserved") {
              statusIcon = <Clock size={32} />;
              statusColor = "#f59e0b"; // Reserved (Orange)
            } else if (slot.status === "maintenance") {
              statusIcon = <Wrench size={32} />;
              statusColor = "#64748b"; // Maintenance (Grey)
            }

            return (
              <div
                key={slot.id}
                onClick={() => setEditingSlot(slot)} // Triggers manual configuration popup on click
                style={{
                  background: "#0c1322",
                  border: `1px solid ${statusColor}`,
                  padding: "1.2rem",
                  borderRadius: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  position: "relative",
                  minHeight: "140px",
                }}
              >
                {/* Individual Slot Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>{slot.id}</h4>
                    <span style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase" }}>
                      {slot.type}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.65rem", color: statusColor, fontWeight: "bold", textTransform: "uppercase" }}>
                    {slot.status}
                  </span>
                </div>

                {/* Central Status Icon Placement */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: statusColor }}>
                  {statusIcon}
                </div>

                {/* Dynamic Footer Information Display */}
                <div style={{ 
                  textAlign: "center", 
                  fontSize: "0.85rem", 
                  color: slot.status === "occupied" ? "#3b82f6" : "#64748b", 
                  fontWeight: "600", 
                  background: slot.status === "occupied" ? "#1e293b" : "transparent", 
                  padding: "2px 4px", 
                  borderRadius: "4px" 
                }}>
                  {slot.info}
                </div>
              </div>
            );
          })}
        </div>

        {/* OVERRIDE MODAL FOR HAND-KEYED SYSTEM INCIDENTS */}
        {editingSlot && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", padding: "2rem", borderRadius: "0.75rem", width: "400px" }}>
              <h3 style={{ color: "#fff", marginTop: 0 }}>Incident Config: Slot {editingSlot.id}</h3>
              
              {/* Manual Input Block for Check-in Overrides */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ color: "#64748b", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
                  Manual License Plate (Use if system failed to sync check-in):
                </label>
                <input
                  type="text"
                  placeholder="e.g., NY-8291-K"
                  value={manualLicensePlate}
                  onChange={(e) => setManualLicensePlate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #1e293b", background: "#131c2e", color: "#fff" }}
                />
              </div>

              {/* 4 Execution Status Update Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                <button onClick={() => handleUpdateStatus("occupied")} style={{ padding: "0.6rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: "600" }}>
                  Occupied
                </button>
                <button onClick={() => handleUpdateStatus("available")} style={{ padding: "0.6rem", background: "#10b981", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: "600" }}>
                  Available (Clear)
                </button>
                <button onClick={() => handleUpdateStatus("reserved")} style={{ padding: "0.6rem", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: "600" }}>
                  Reserved
                </button>
                <button onClick={() => handleUpdateStatus("maintenance")} style={{ padding: "0.6rem", background: "#64748b", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: "600" }}>
                  Maintenance
                </button>
              </div>

              <button onClick={() => setEditingSlot(null)} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#64748b", border: "1px solid #1e293b", borderRadius: "0.375rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ParkingManagement;