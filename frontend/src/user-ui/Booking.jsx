import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { 
  Car, Bike, Calendar, Clock, 
  ArrowRight, CheckCircle2, ChevronDown, X 
} from "lucide-react";

const Booking = () => {
  // 1. STATE MANAGEMENT
  const [vehicleType, setVehicleType] = useState("Car"); 
  const [date, setDate] = useState("2023-11-24"); 
  const [fromTime, setFromTime] = useState("08:00");
  const [toTime, setToTime] = useState("17:00");
  const [floor, setFloor] = useState("G"); 
  const [selectedSlot, setSelectedSlot] = useState("");

  // State lưu danh sách ô đỗ (Khi chưa có API sẽ tạm thời chạy danh sách trống)
  const [availableSlots, setAvailableSlots] = useState([]);

  // States tính toán chi phí & thời gian
  const [duration, setDuration] = useState(9);
  const baseRate = 2.50;
  const serviceFee = 1.50;
  const [totalEstimated, setTotalEstimated] = useState(24.00);

  // State quản lý Custom Alert Modal
  const [successModal, setSuccessModal] = useState({ show: false, data: null });

  // =================================================================
  // TODO: API INTEGRATION - FETCH LIVE AVAILABLE SLOTS FROM BACKEND
  // =================================================================
  // Hàm này sẽ tự động chạy mỗi khi User/Admin thay đổi "Tầng" (floor) hoặc "Ngày" (date)
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      /* try {
        // Gửi request lên Backend kèm query params để lọc đúng tầng và ngày đỗ
        const response = await axios.get(`/api/slots/available?floor=${floor}&date=${date}`);
        
        // Giả sử backend trả về mảng chuỗi gồm các slot ID trống: ["G-001", "G-002", ...]
        setAvailableSlots(response.data); 
      } catch (error) {
        console.error("Failed to fetch slots from server:", error);
      }
      */

      // --- LOGIC MOCK DỰ PHÒNG KHI CHƯA CÓ API (Giữ nguyên quy tắc 100 slot thật của mày) ---
      const fallbackSlots = [];
      if (floor === "G") {
        for (let i = 1; i <= 40; i++) fallbackSlots.push(`G-${String(i).padStart(3, "0")}`);
      } else if (floor === "A1") {
        for (let i = 41; i <= 70; i++) fallbackSlots.push(`A1-${String(i).padStart(3, "0")}`);
      } else if (floor === "A2") {
        for (let i = 71; i <= 100; i++) fallbackSlots.push(`A2-${String(i).padStart(3, "0")}`);
      }
      setAvailableSlots(fallbackSlots);
      // ---------------------------------------------------------------------------------
    };

    fetchAvailableSlots();
  }, [floor, date]); // Lắng nghe sự thay đổi của tầng và ngày đỗ để tự cập nhật danh sách ô trống mới

  // Tự động cập nhật Loại xe khi chọn Tầng
  const handleFloorChange = (e) => {
    const chosenFloor = e.target.value;
    setFloor(chosenFloor);
    setSelectedSlot(""); 
    
    if (chosenFloor === "G") {
      setVehicleType("Motorbike");
    } else {
      setVehicleType("Car");
    }
  };

  // 2. LOGIC TỰ ĐỘNG TÍNH TOÁN GIỜ VÀ SỐ TIỀN
  useEffect(() => {
    if (fromTime && toTime) {
      const [fromHours, fromMins] = fromTime.split(":").map(Number);
      const [toHours, toMins] = toTime.split(":").map(Number);
      
      let diffInHours = (toHours + toMins / 60) - (fromHours + fromMins / 60);
      if (diffInHours < 0) diffInHours += 24; 
      
      const calculatedDuration = Math.round(diffInHours * 10) / 10;
      setDuration(calculatedDuration);
      
      const computedTotal = (calculatedDuration * baseRate) + serviceFee;
      setTotalEstimated(computedTotal > serviceFee ? computedTotal : 0);
    }
  }, [fromTime, toTime]);

  // 3. LOGIC SUBMIT CONFIRM BOOKING
  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      alert("Please select a specific slot ID before confirming!");
      return;
    }

    // Gói toàn bộ dữ liệu có trên màn hình thành 1 payload chuẩn JSON gửi đi
    const bookingPayload = {
      vehicleType,
      date,
      schedule: { from: fromTime, to: toTime },
      location: { floor, slot: selectedSlot },
      summary: { duration, total: totalEstimated }
    };

    // =================================================================
    // TODO: API INTEGRATION - POST NEW RESERVATION TO DATABASE
    // =================================================================
    /* try {
      // Gửi lệnh tạo mới một lượt đặt chỗ lên Database
      const response = await axios.post('/api/reservations/create', bookingPayload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // Nếu cần token bảo mật
      });

      if (response.status === 201 || response.status === 200) {
        // Nếu Server báo tạo thành công, bật Pop-up thông báo lên màn hình
        setSuccessModal({ show: true, data: bookingPayload });
      }
    } catch (error) {
      console.error("Server creation crashed:", error);
      alert("Error occurred while creating reservation inside backend.");
    }
    */

    // --- Demo giả lập chạy tạm trên FE trước khi có API ---
    setSuccessModal({ show: true, data: bookingPayload });
    // ----------------------------------------------------
  };

  const closeSuccessModal = () => {
    setSuccessModal({ show: false, data: null });
    setSelectedSlot("");
  };

  return (
    <div className="dashboard-layout" style={{ display: "flex", background: "#060b13", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <Header />

        {/* Section Title */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ color: "#fff", fontSize: "1.75rem", margin: "0", fontWeight: "600" }}>Create New Reservation</h1>
          <p style={{ color: "#64748b", margin: "0.5rem 0 0 0", fontSize: "0.95rem" }}>Configure booking details for incoming infrastructure traffic.</p>
        </div>

        {/* Form Container */}
        <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* 1. VEHICLE TYPE SELECTOR BLOCK */}
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "1rem" }}>1. VEHICLE TYPE</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                
                <div 
                  onClick={() => { setVehicleType("Car"); if(floor === "G") setFloor("A1"); }}
                  style={{
                    background: "#060b13", borderRadius: "0.5rem", padding: "2.5rem 1rem", textAlign: "center", cursor: "pointer", position: "relative",
                    border: vehicleType === "Car" ? "1px solid #3b82f6" : "1px solid #1e293b",
                    transition: "0.2s"
                  }}
                >
                  <Car size={32} color={vehicleType === "Car" ? "#3b82f6" : "#64748b"} style={{ margin: "0 auto 0.75rem auto" }} />
                  <p style={{ margin: 0, color: "#fff", fontWeight: "bold", fontSize: "1rem" }}>Car</p>
                  {vehicleType === "Car" && (
                    <CheckCircle2 size={18} color="#3b82f6" style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }} />
                  )}
                </div>

                <div 
                  onClick={() => { setVehicleType("Motorbike"); setFloor("G"); }}
                  style={{
                    background: "#060b13", borderRadius: "0.5rem", padding: "2.5rem 1rem", textAlign: "center", cursor: "pointer", position: "relative",
                    border: vehicleType === "Motorbike" ? "1px solid #3b82f6" : "1px solid #1e293b",
                    transition: "0.2s"
                  }}
                >
                  <Bike size={32} color={vehicleType === "Motorbike" ? "#3b82f6" : "#64748b"} style={{ margin: "0 auto 0.75rem auto" }} />
                  <p style={{ margin: 0, color: "#fff", fontWeight: "bold", fontSize: "1rem" }}>Motorbike</p>
                  {vehicleType === "Motorbike" && (
                    <CheckCircle2 size={18} color="#3b82f6" style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }} />
                  )}
                </div>

              </div>
            </div>

            {/* 2. SCHEDULE SELECTION PICKERS */}
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "1rem" }}>2. SCHEDULE SELECTION</span>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "1rem" }}>
                
                <div>
                  <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>DATE</label>
                  <div style={{ position: "relative" }}>
                    <Calendar size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.5rem 0.6rem 2.25rem", background: "#060b13", border: "1px solid #1e293b", borderRadius: "0.375rem", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>FROM</label>
                  <div style={{ position: "relative" }}>
                    <Clock size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.5rem 0.6rem 2.25rem", background: "#060b13", border: "1px solid #1e293b", borderRadius: "0.375rem", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>TO</label>
                  <div style={{ position: "relative" }}>
                    <Clock size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.5rem 0.6rem 2.25rem", background: "#060b13", border: "1px solid #1e293b", borderRadius: "0.375rem", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
                  </div>
                </div>

              </div>
            </div>

            {/* 3. PARKING LOCATION */}
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "1rem" }}>3. PARKING LOCATION</span>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>SELECT FLOOR</label>
                  <div style={{ position: "relative" }}>
                    <select value={floor} onChange={handleFloorChange} style={{ width: "100%", padding: "0.65rem 1rem", background: "#060b13", border: "1px solid #1e293b", borderRadius: "0.375rem", color: "#fff", fontSize: "0.85rem", cursor: "pointer", appearance: "none" }}>
                      <option value="G">Floor G (Motorbike)</option>
                      <option value="A1">Floor A1 (Car)</option>
                      <option value="A2">Floor A2 (Car)</option>
                    </select>
                    <ChevronDown size={14} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>SELECT SLOT</label>
                  <div style={{ position: "relative" }}>
                    <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} style={{ width: "100%", padding: "0.65rem 1rem", background: "#060b13", border: "1px solid #1e293b", borderRadius: "0.375rem", color: "#fff", fontSize: "0.85rem", cursor: "pointer", appearance: "none" }}>
                      <option value="">-- Choose an Available Slot --</option>
                      {availableSlots.map((slotId) => (
                        <option key={slotId} value={slotId}>{slotId}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT AREA: RESERVATION SUMMARY */}
          <div style={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: "0.75rem", padding: "1.5rem" }}>
            
            <h3 style={{ color: "#fff", margin: "0 0 1.5rem 0", fontSize: "0.8rem", color: "#64748b", fontWeight: "bold", letterSpacing: "0.5px" }}>RESERVATION SUMMARY</h3>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "1rem" }}>
              <span style={{ color: "#94a3b8" }}>Duration</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>{duration} Hours</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "1rem" }}>
              <span style={{ color: "#94a3b8" }}>Base Rate (${baseRate.toFixed(2)}/hr)</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>${(duration * baseRate).toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              <span style={{ color: "#94a3b8" }}>Service Fee</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>${serviceFee.toFixed(2)}</span>
            </div>

            <div style={{ width: "100%", height: "1px", background: "#1e293b", marginBottom: "1.5rem" }}></div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>TOTAL ESTIMATED</span>
              <span style={{ fontSize: "2rem", color: "#3b82f6", fontWeight: "bold", letterSpacing: "-0.5px" }}>${totalEstimated.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleConfirmBooking}
              style={{
                width: "100%", padding: "0.85rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "0.5rem",
                cursor: "pointer", fontSize: "0.95rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)", transition: "0.2s"
              }}
            >
              <span>Confirm Booking</span>
              <ArrowRight size={16} />
            </button>

            <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#64748b", margin: "1rem 0 0 0", lineHeight: "1.4", padding: "0 0.5rem" }}>
              By confirming, you agree to the facility's hourly terms and conditions.
            </p>

          </div>

        </div>

        {/* ============================================================= */}
        {/* CUSTOM SUCCESS NOTIFICATION MODAL */}
        {/* ============================================================= */}
        {successModal.show && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(3, 7, 18, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#0c1322", border: "1px solid #1e293b", padding: "2.5rem 2rem", borderRadius: "1rem", width: "440px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", position: "relative" }}>
              
              <button onClick={closeSuccessModal} style={{ position: "absolute", top: "1rem", right: "1rem", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}><X size={18} /></button>

              <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
                <CheckCircle2 size={36} />
              </div>
              
              <h3 style={{ color: "#fff", margin: "0 0 0.5rem 0", fontSize: "1.4rem", fontWeight: "600" }}>Booking Confirmed!</h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.75rem 0", lineHeight: "1.5" }}>
                The reservation data has been updated inside the core system database repository.
              </p>

              <div style={{ background: "#060b13", border: "1px solid #1e293b", padding: "1rem", borderRadius: "0.5rem", textAlign: "left", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>Vehicle Type:</span><span style={{ color: "#fff", fontWeight: "600" }}>{successModal.data?.vehicleType}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>Target Location:</span><span style={{ color: "#3b82f6", fontWeight: "bold" }}>Floor {successModal.data?.location.floor} - Slot {successModal.data?.location.slot}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>Total Paid:</span><span style={{ color: "#10b981", fontWeight: "bold" }}>${successModal.data?.summary.total.toFixed(2)}</span></div>
              </div>

              <button 
                onClick={closeSuccessModal}
                style={{ width: "100%", padding: "0.75rem", background: "#10b981", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}
              >
                Great, Thank You
              </button>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Booking;