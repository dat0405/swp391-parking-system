import React, { useState } from "react";
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

  const [formData, setFormData] = useState({
    vehicleTypeId: "1",
    vehicleType: "CAR",
    slotId: "",
    licensePlate: "",
    color: "",
    startTime: "",
    endTime: "",
  });

  const getSavedUser = () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

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

      const response = await bookingApi.createBooking(payload);
      const createdBooking = response.data;

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "created booking",
            target: createdBooking?.licensePlate || payload.licensePlate,
            detail: createdBooking?.slotCode || `slot ID ${payload.slotId}`,
          },
        })
      );

      alert("Tạo booking thành công. Bạn sẽ được chuyển sang trang Reservations.");

      navigate("/reservations");
    } catch (error) {
      console.error("Create booking failed:", error);
      alert(error.response?.data?.message || error.response?.data || "Tạo booking thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{ padding: "1.5rem 2rem", boxSizing: "border-box" }}
      >
        <Header />

        <div className="booking-page">
          <style>{`
            .booking-page {
              color: #e5e7eb;
              padding-top: 1.5rem;
              padding-bottom: 2rem;
              box-sizing: border-box;
              width: 100%;
              min-width: 0;
            }

            .booking-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1.25rem;
              margin-bottom: 1.5rem;
            }

            .booking-title-block h1 {
              margin: 0;
              font-size: 1.75rem;
              font-weight: 800;
              color: #f8fafc;
              letter-spacing: -0.04em;
            }

            .booking-title-block p {
              margin: 0.5rem 0 0;
              color: #64748b;
              font-size: 0.9rem;
            }

            .booking-action-card {
              width: min(420px, 100%);
              background: rgba(15, 23, 42, 0.9);
              border: 1px solid rgba(148, 163, 184, 0.18);
              border-radius: 0.75rem;
              padding: 1rem 1.25rem;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
              box-sizing: border-box;
            }

            .booking-action-card span {
              display: block;
              color: #94a3b8;
              font-size: 0.8rem;
              margin-bottom: 0.4rem;
            }

            .booking-action-card strong {
              display: block;
              color: #f8fafc;
              font-size: 1rem;
              line-height: 1.4;
            }

            .booking-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }

            .booking-card {
              background: #1e293b;
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 0.75rem;
              box-sizing: border-box;
              min-width: 0;
            }

            .booking-form-card {
              padding: 1.5rem;
            }

            .card-title {
              display: flex;
              align-items: center;
              gap: 0.65rem;
              margin-bottom: 1.25rem;
            }

            .card-title h2 {
              margin: 0;
              color: #f8fafc;
              font-size: 1.1rem;
              font-weight: 750;
            }

            .card-title svg {
              color: #38bdf8;
              flex-shrink: 0;
            }

            .booking-form {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 1rem;
              align-items: start;
            }

            .form-group {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              min-width: 0;
            }

            .form-group label {
              color: #cbd5e1;
              font-size: 0.8rem;
              font-weight: 650;
            }

            .field-wide {
              grid-column: span 2;
            }

            .time-row {
              grid-column: span 2;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 1rem;
              min-width: 0;
            }

            .input-wrapper {
              display: flex;
              align-items: center;
              gap: 0.65rem;
              background: #0f172a;
              border: 1px solid #334155;
              border-radius: 0.5rem;
              padding: 0 0.8rem;
              min-height: 46px;
              transition: 0.2s ease;
              box-sizing: border-box;
              overflow: hidden;
              width: 100%;
            }

            .input-wrapper:focus-within {
              border-color: rgba(56, 189, 248, 0.8);
              box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12);
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
              color: #f8fafc;
              font-size: 0.9rem;
              font-family: inherit;
              min-width: 0;
              box-sizing: border-box;
            }

            .input-wrapper input[type="datetime-local"] {
              font-size: 0.82rem;
            }

            .plate-hint {
              color: #94a3b8;
              font-size: 0.75rem;
              line-height: 1.4;
            }

            .vehicle-toggle {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0.75rem;
            }

            .vehicle-option {
              border: 1px solid #334155;
              background: #0f172a;
              color: #94a3b8;
              border-radius: 0.5rem;
              min-height: 46px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              cursor: pointer;
              transition: 0.2s ease;
              font-weight: 650;
            }

            .vehicle-option.active {
              border-color: rgba(56, 189, 248, 0.9);
              color: #e0f2fe;
              background: rgba(14, 165, 233, 0.16);
            }

            .submit-btn,
            .secondary-link-btn {
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 0.45rem;
              transition: 0.2s ease;
            }

            .submit-btn {
              grid-column: 1 / -1;
              margin-top: 0.25rem;
              min-height: 50px;
              background: #3b82f6;
              color: white;
              font-weight: 800;
              font-size: 0.95rem;
            }

            .submit-btn:hover:not(:disabled) {
              background: #2563eb;
            }

            .submit-btn:disabled {
              background: #334155;
              color: #94a3b8;
              cursor: not-allowed;
            }

            .secondary-link-btn {
              min-height: 44px;
              padding: 0 1rem;
              background: #0f172a;
              color: #cbd5e1;
              border: 1px solid #334155;
              font-weight: 700;
              margin-top: 0.9rem;
            }

            .secondary-link-btn:hover {
              border-color: #38bdf8;
              color: #f8fafc;
            }

            .booking-note {
              margin-top: 1rem;
              padding: 1rem;
              background: rgba(15, 23, 42, 0.7);
              border: 1px solid rgba(148, 163, 184, 0.14);
              border-radius: 0.75rem;
              color: #94a3b8;
              font-size: 0.86rem;
              line-height: 1.5;
            }

            @media (max-width: 1280px) {
              .booking-form {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .field-wide {
                grid-column: span 1;
              }

              .time-row {
                grid-column: 1 / -1;
              }
            }

            @media (max-width: 900px) {
              .booking-header {
                flex-direction: column;
              }

              .booking-action-card {
                width: 100%;
              }
            }

            @media (max-width: 720px) {
              .booking-form {
                grid-template-columns: 1fr;
              }

              .field-wide,
              .time-row {
                grid-column: 1 / -1;
              }

              .time-row {
                grid-template-columns: 1fr;
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

          <div className="booking-layout">
            <div className="booking-card booking-form-card">
              <div className="card-title">
                <BadgeCheck size={22} />
                <h2>Create booking</h2>
              </div>

              <form className="booking-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Current user</label>
                  <div className="input-wrapper">
                    <User size={17} />
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
                    <FileText size={17} />
                    <input type="text" value={currentUserId || ""} readOnly />
                  </div>
                </div>

                <div className="form-group field-wide">
                  <label>Vehicle type</label>
                  <div className="vehicle-toggle">
                    <button
                      type="button"
                      className={`vehicle-option ${formData.vehicleType === "CAR" ? "active" : ""}`}
                      onClick={() => handleVehicleTypeChange("CAR")}
                    >
                      <Car size={18} />
                      Car
                    </button>

                    <button
                      type="button"
                      className={`vehicle-option ${formData.vehicleType === "MOTORBIKE" ? "active" : ""}`}
                      onClick={() => handleVehicleTypeChange("MOTORBIKE")}
                    >
                      <Bike size={18} />
                      Motorbike
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Slot ID</label>
                  <div className="input-wrapper">
                    <MapPin size={17} />
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
                  <label>License plate</label>
                  <div className="input-wrapper">
                    {formData.vehicleType === "CAR" ? <Car size={17} /> : <Bike size={17} />}
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
                  <label>Vehicle color</label>
                  <div className="input-wrapper">
                    <FileText size={17} />
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      placeholder="Example: Black"
                    />
                  </div>
                </div>

                <div className="time-row">
                  <div className="form-group">
                    <label>Start time</label>
                    <div className="input-wrapper">
                      <CalendarDays size={17} />
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
                      <Clock size={17} />
                      <input
                        type="datetime-local"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  <Plus size={18} />
                  {isSubmitting ? "Creating..." : "Create booking"}
                </button>
              </form>

              <div className="booking-note">
                After a booking is created successfully, the system will redirect you to the Reservations page for tracking and management.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Booking;