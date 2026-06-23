import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Car,
  Bike,
  MapPin,
  BadgeCheck,
  User,
  FileText,
  Plus,
  ArrowRight,
  CheckCircle2,
  X
} from "lucide-react";

import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { bookingApi } from "../api/bookingApi";
import {
  formatPlateByVehicleType,
  getPlateHint,
  getPlatePlaceholder,
  validateVietnamPlate,
} from "../utils/plateUtils";

function Booking() {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, data: null });

  const [formData, setFormData] = useState({
    vehicleTypeId: "1",
    vehicleType: "CAR",
    slotId: "",
    licensePlate: "",
    color: "",
    startTime: "",
    endTime: "",
  });

  // --- STATE TÍNH TOÁN CHI PHÍ & THỜI GIAN ---
  const [duration, setDuration] = useState(0);
  const [totalEstimated, setTotalEstimated] = useState(0);

  const getSavedUser = () => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch (error) {
      return null;
    }
  };

  const currentUser = getSavedUser();
  const currentUserId = currentUser?.userId || currentUser?.id;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVehicleTypeChange = (vehicleType) => {
    const vehicleTypeId = vehicleType === "CAR" ? "1" : "2";
    setFormData((prev) => ({
      ...prev,
      vehicleType,
      vehicleTypeId,
      licensePlate: "",
    }));
  };

  const handleLicensePlateChange = (event) => {
    const formattedPlate = formatPlateByVehicleType(
      event.target.value,
      formData.vehicleType
    );
    setFormData((prev) => ({
      ...prev,
      licensePlate: formattedPlate,
    }));
  };

  const normalizeDateTimeForBackend = (value) => {
    if (!value) return "";
    return value.length === 16 ? `${value}:00` : value;
  };

  // --- LOGIC TỰ ĐỘNG TÍNH THỜI GIAN VÀ TIỀN BẠC ---
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);

      if (end > start) {
        // Tính khoảng cách theo giờ (làm tròn đến 1 chữ số thập phân)
        const diffInMs = end - start;
        const diffInHours = diffInMs / (1000 * 60 * 60);
        const calculatedDuration = Math.round(diffInHours * 10) / 10;
        setDuration(calculatedDuration);

        // Giá tiền: Ô tô (CAR) = 5000, Xe máy (MOTORBIKE) = 4000
        const ratePerHour = formData.vehicleType === "CAR" ? 5000 : 4000;
        setTotalEstimated(calculatedDuration * ratePerHour);
      } else {
        setDuration(0);
        setTotalEstimated(0);
      }
    } else {
      setDuration(0);
      setTotalEstimated(0);
    }
  }, [formData.startTime, formData.endTime, formData.vehicleType]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!currentUserId) {
      alert("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }
    if (!formData.slotId) {
      alert("Vui lòng nhập Slot ID.");
      return;
    }
    if (!formData.vehicleTypeId) {
      alert("Vui lòng chọn loại xe.");
      return;
    }
    if (!formData.licensePlate.trim()) {
      alert("Vui lòng nhập biển số xe.");
      return;
    }
    if (!validateVietnamPlate(formData.licensePlate, formData.vehicleType)) {
      alert(getPlateHint(formData.vehicleType));
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      alert("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      return;
    }
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      alert("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        userId: Number(currentUserId),
        slotId: Number(formData.slotId),
        vehicleTypeId: Number(formData.vehicleTypeId),
        licensePlate: formData.licensePlate.trim().toUpperCase(),
        color: formData.color.trim() || null,
        startTime: normalizeDateTimeForBackend(formData.startTime),
        endTime: normalizeDateTimeForBackend(formData.endTime),
      };

      await bookingApi.createBooking(payload);
      setSuccessModal({ show: true, data: payload });
    } catch (error) {
      console.error("Create booking failed:", error);
      alert(error.response?.data?.message || error.response?.data || "Tạo booking thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModal({ show: false, data: null });
    navigate("/reservations");
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="booking-page">
          <style>{`
            .main-content {
              flex: 1;
              padding: 2rem;
              overflow-y: auto;
              background: #060b13;
              min-height: 100vh;
              box-sizing: border-box;
            }

            .booking-page {
              color: #e5e7eb;
              font-family: system-ui, -apple-system, sans-serif;
            }

            .booking-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1.5rem;
              margin-bottom: 2rem;
            }

            .booking-title-block h1 {
              margin: 0;
              font-size: 1.75rem;
              font-weight: 600;
              color: #fff;
            }

            .booking-title-block p {
              margin: 0.5rem 0 0 0;
              color: #64748b;
              font-size: 0.95rem;
            }

            .booking-action-card {
              width: min(420px, 100%);
              background: #0c1322;
              border: 1px solid #1e293b;
              border-radius: 0.75rem;
              padding: 1.25rem;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
              box-sizing: border-box;
            }

            .booking-action-card span {
              display: block;
              color: #64748b;
              font-size: 0.75rem;
              font-weight: bold;
              margin-bottom: 0.4rem;
              text-transform: uppercase;
            }

            .booking-action-card strong {
              display: block;
              color: #fff;
              font-size: 0.9rem;
              line-height: 1.4;
              font-weight: normal;
            }

            .secondary-link-btn {
              min-height: 38px;
              padding: 0 1rem;
              background: #060b13;
              color: #cbd5e1;
              border: 1px solid #1e293b;
              font-weight: 700;
              font-size: 0.85rem;
              margin-top: 0.9rem;
              border-radius: 0.375rem;
              cursor: pointer;
              transition: 0.2s ease;
            }

            .secondary-link-btn:hover {
              border-color: #3b82f6;
              color: #fff;
            }

            .booking-grid-layout {
              display: grid;
              grid-template-columns: 2.1fr 1fr;
              gap: 1.5rem;
              align-items: start;
            }

            .form-section-container {
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
            }

            .booking-card-block {
              background: #0c1322;
              border: 1px solid #1e293b;
              border-radius: 0.75rem;
              padding: 1.5rem;
              box-sizing: border-box;
            }

            .block-section-tag {
              font-size: 0.75rem;
              color: #64748b;
              font-weight: bold;
              display: block;
              margin-bottom: 1rem;
              text-transform: uppercase;
            }

            .booking-inner-form {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 1rem;
            }

            .form-group {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              min-width: 0;
            }

            .form-group label {
              color: #64748b;
              font-size: 0.7rem;
              font-weight: bold;
              text-transform: uppercase;
            }

            .field-span-full {
              grid-column: span 2;
            }

            .input-wrapper {
              display: flex;
              align-items: center;
              gap: 0.65rem;
              background: #060b13;
              border: 1px solid #1e293b;
              border-radius: 0.375rem;
              padding: 0 0.75rem;
              min-height: 42px;
              transition: 0.2s ease;
              box-sizing: border-box;
              width: 100%;
            }

            .input-wrapper:focus-within {
              border-color: #3b82f6;
            }

            .input-wrapper svg {
              color: #64748b;
              flex-shrink: 0;
            }

            .input-wrapper input {
              width: 100%;
              border: none;
              outline: none;
              background: transparent;
              color: #fff;
              font-size: 0.85rem;
              font-family: inherit;
              box-sizing: border-box;
            }

            .input-wrapper input:read-only {
              color: #64748b;
              cursor: not-allowed;
            }

            .input-wrapper input[type="datetime-local"] {
              color-scheme: dark;
            }

            .plate-hint {
              color: #64748b;
              font-size: 0.7rem;
              line-height: 1.4;
              margin-top: 0.25rem;
            }

            .vehicle-selector-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            }

            .vehicle-card-option {
              background: #060b13;
              border: 1px solid #1e293b;
              border-radius: 0.5rem;
              padding: 2.5rem 1rem;
              text-align: center;
              cursor: pointer;
              position: relative;
              transition: 0.2s;
              box-sizing: border-box;
            }

            .vehicle-card-option.active {
              border-color: #3b82f6;
            }

            .vehicle-card-title {
              margin: 0;
              color: #fff;
              font-weight: bold;
              font-size: 1rem;
            }

            .vehicle-card-check-icon {
              position: absolute;
              top: 0.75rem;
              right: 0.75rem;
            }

            .summary-sidebar-panel {
              background: #0c1322;
              border: 1px solid #1e293b;
              border-radius: 0.75rem;
              padding: 1.5rem;
              box-sizing: border-box;
            }

            .summary-title {
              color: #64748b;
              margin: 0 0 1.5rem 0;
              font-size: 0.8rem;
              font-weight: bold;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .summary-divider {
              width: 100%;
              height: 1px;
              background: #1e293b;
              margin: 1.5rem 0;
            }

            .submit-action-button {
              width: 100%;
              padding: 0.85rem;
              background: #3b82f6;
              color: #fff;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 0.95rem;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
              transition: 0.2s;
            }

            .submit-action-button:hover:not(:disabled) {
              background: #2563eb;
            }

            .submit-action-button:disabled {
              background: #1e293b;
              color: #64748b;
              cursor: not-allowed;
              box-shadow: none;
            }

            .booking-note-text {
              text-align: center;
              font-size: 0.7rem;
              color: #64748b;
              margin: 1rem 0 0 0;
              line-height: 1.4;
              padding: 0 0.5rem;
            }

            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(3, 7, 18, 0.85);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2000;
              backdrop-filter: blur(4px);
            }

            .modal-content-card {
              background: #0c1322;
              border: 1px solid #1e293b;
              padding: 2.5rem 2rem;
              border-radius: 1rem;
              width: 440px;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              position: relative;
              box-sizing: border-box;
            }

            .modal-close-btn {
              position: absolute;
              top: 1rem;
              right: 1rem;
              background: transparent;
              border: none;
              color: #64748b;
              cursor: pointer;
            }

            .modal-icon-circle {
              background: rgba(16, 185, 129, 0.1);
              color: #10b981;
              width: 64px;
              height: 64px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem auto;
            }

            .modal-info-box {
              background: #060b13;
              border: 1px solid #1e293b;
              padding: 1rem;
              border-radius: 0.5rem;
              text-align: left;
              margin-bottom: 1.5rem;
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              font-size: 0.85rem;
            }

            .info-box-row {
              display: flex;
              justify-content: space-between;
            }

            .modal-primary-btn {
              width: 100%;
              padding: 0.75rem;
              background: #10b981;
              color: #fff;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              font-weight: bold;
              font-size: 0.9rem;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
            }

            @media (max-width: 1024px) {
              .booking-grid-layout {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 768px) {
              .booking-header {
                flex-direction: column;
              }
              .booking-action-card {
                width: 100%;
              }
              .booking-inner-form, .vehicle-selector-grid {
                grid-template-columns: 1fr;
              }
              .field-span-full {
                grid-column: span 1;
              }
            }
          `}</style>

          <div className="booking-header">
            <div className="booking-title-block">
              <h1>New Booking</h1>
              <p>Create a new parking reservation. Reservation management is handled on the Reservations page.</p>
            </div>

            <div className="booking-action-card">
              <span>Booking management</span>
              <strong>View, filter, confirm, cancel, or delete bookings in Reservations.</strong>

              <button
                type="button"
                className="secondary-link-btn"
                onClick={() => navigate("/reservations")}
              >
                Go to Reservations
              </button>
            </div>
          </div>

          <div className="booking-grid-layout">
            {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN */}
            <form className="form-section-container" onSubmit={handleSubmit}>
              
              {/* BLOCK 1: VEHICLE TYPE SELECTOR */}
              <div className="booking-card-block">
                <span className="block-section-tag">1. Vehicle Type</span>
                <div className="vehicle-selector-grid">
                  <div
                    className={`vehicle-card-option ${formData.vehicleType === "CAR" ? "active" : ""}`}
                    onClick={() => handleVehicleTypeChange("CAR")}
                  >
                    <Car size={32} color={formData.vehicleType === "CAR" ? "#3b82f6" : "#64748b"} style={{ margin: "0 auto 0.75rem auto" }} />
                    <p className="vehicle-card-title">Car</p>
                    {formData.vehicleType === "CAR" && (
                      <CheckCircle2 size={18} color="#3b82f6" className="vehicle-card-check-icon" />
                    )}
                  </div>

                  <div
                    className={`vehicle-card-option ${formData.vehicleType === "MOTORBIKE" ? "active" : ""}`}
                    onClick={() => handleVehicleTypeChange("MOTORBIKE")}
                  >
                    <Bike size={32} color={formData.vehicleType === "MOTORBIKE" ? "#3b82f6" : "#64748b"} style={{ margin: "0 auto 0.75rem auto" }} />
                    <p className="vehicle-card-title">Motorbike</p>
                    {formData.vehicleType === "MOTORBIKE" && (
                      <CheckCircle2 size={18} color="#3b82f6" className="vehicle-card-check-icon" />
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCK 2: BOOKING DETAILS FORM */}
              <div className="booking-card-block">
                <span className="block-section-tag">2. Reservation Details</span>
                
                <div className="booking-inner-form">
                  <div className="form-group">
                    <label>Current user</label>
                    <div className="input-wrapper">
                      <User size={14} />
                      <input
                        type="text"
                        value={currentUser?.fullName || currentUser?.name || currentUser?.email || "Unknown user"}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>User ID</label>
                    <div className="input-wrapper">
                      <FileText size={14} />
                      <input type="text" value={currentUserId || ""} readOnly />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Slot ID</label>
                    <div className="input-wrapper">
                      <MapPin size={14} />
                      <input
                        type="number"
                        name="slotId"
                        value={formData.slotId}
                        onChange={handleChange}
                        placeholder="Example: 1"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Vehicle color</label>
                    <div className="input-wrapper">
                      <FileText size={14} />
                      <input
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        placeholder="Example: Black"
                      />
                    </div>
                  </div>

                  <div className="form-group field-span-full">
                    <label>License plate</label>
                    <div className="input-wrapper">
                      {formData.vehicleType === "CAR" ? <Car size={14} /> : <Bike size={14} />}
                      <input
                        type="text"
                        name="licensePlate"
                        value={formData.licensePlate}
                        onChange={handleLicensePlateChange}
                        placeholder={getPlatePlaceholder(formData.vehicleType)}
                      />
                    </div>
                    <small className="plate-hint">
                      {getPlateHint(formData.vehicleType)}
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Start time</label>
                    <div className="input-wrapper">
                      <CalendarDays size={14} />
                      <input
                        type="datetime-local"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>End time</label>
                    <div className="input-wrapper">
                      <Clock size={14} />
                      <input
                        type="datetime-local"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* CỘT PHẢI: RESERVATION SUMMARY (CẬP NHẬT TÍNH TIỀN THỰC TẾ) */}
            <div className="summary-sidebar-panel">
              <h3 className="summary-title">Reservation Summary</h3>
              
              <div className="info-box-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span style={{ color: "#94a3b8" }}>Vehicle Type</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>{formData.vehicleType}</span>
              </div>

              <div className="info-box-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span style={{ color: "#94a3b8" }}>Slot Target</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>{formData.slotId ? `Slot ID ${formData.slotId}` : "Not selected"}</span>
              </div>

              <div className="info-box-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span style={{ color: "#94a3b8" }}>Duration</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>{duration} Hours</span>
              </div>

              <div className="info-box-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span style={{ color: "#94a3b8" }}>Rate per Hour</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>
                  {formData.vehicleType === "CAR" ? "5,000" : "4,000"} VNĐ
                </span>
              </div>

              <div className="summary-divider"></div>

              <div className="info-box-row" style={{ alignItems: "center", marginBottom: "1.75rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>TOTAL ESTIMATED</span>
                <span style={{ fontSize: "1.6rem", color: "#3b82f6", fontWeight: "bold", letterSpacing: "-0.5px" }}>
                  {totalEstimated.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>

              <button 
                type="submit" 
                className="submit-action-button" 
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                <span>{isSubmitting ? "Creating..." : "Confirm Booking"}</span>
                <ArrowRight size={16} />
              </button>

              <p className="booking-note-text">
                After a booking is created successfully, the system will redirect you to the Reservations page for tracking and management.
              </p>
            </div>
          </div>
        </div>

        {/* CUSTOM SUCCESS NOTIFICATION MODAL */}
        {successModal.show && (
          <div className="modal-overlay">
            <div className="modal-content-card">
              <button onClick={closeSuccessModal} className="modal-close-btn">
                <X size={18} />
              </button>

              <div className="modal-icon-circle">
                <CheckCircle2 size={36} />
              </div>
              
              <h3 style={{ color: "#fff", margin: "0 0 0.5rem 0", fontSize: "1.4rem", fontWeight: "600" }}>Booking Confirmed!</h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.75rem 0", lineHeight: "1.5" }}>
                The reservation data has been updated inside the core system database repository.
              </p>

              <div className="modal-info-box">
                <div className="info-box-row">
                  <span style={{ color: "#64748b" }}>Vehicle Type:</span>
                  <span style={{ color: "#fff", fontWeight: "600" }}>{successModal.data?.vehicleType}</span>
                </div>
                <div className="info-box-row">
                  <span style={{ color: "#64748b" }}>Target Location:</span>
                  <span style={{ color: "#3b82f6", fontWeight: "bold" }}>Slot ID {successModal.data?.slotId}</span>
                </div>
                <div className="info-box-row">
                  <span style={{ color: "#64748b" }}>License Plate:</span>
                  <span style={{ color: "#10b981", fontWeight: "bold" }}>{successModal.data?.licensePlate}</span>
                </div>
                <div className="info-box-row">
                  <span style={{ color: "#64748b" }}>Total Estimated:</span>
                  <span style={{ color: "#3b82f6", fontWeight: "bold" }}>{totalEstimated.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              </div>

              <button onClick={closeSuccessModal} className="modal-primary-btn">
                Great, Thank You
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Booking;