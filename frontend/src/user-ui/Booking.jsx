import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Car,
  Bike,
  MapPin,
  User,
  FileText,
  ArrowRight,
  CheckCircle2,
  X,
  ChevronDown
} from "lucide-react";

import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import axiosClient from "../api/axiosClient";
import { bookingApi } from "../api/bookingApi";
import {
  formatPlateByVehicleType,
  getPlateHint,
  getPlatePlaceholder,
  validateVietnamPlate
} from "../utils/plateUtils";

const normalizeVehicleType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  if (
    value.includes("motor") ||
    value.includes("bike") ||
    value.includes("xe máy") ||
    value.includes("motorbike")
  ) {
    return "motorbike";
  }

  if (
    value.includes("car") ||
    value.includes("ô tô") ||
    value.includes("oto")
  ) {
    return "car";
  }

  return value || "unknown";
};

const getSlotCode = (slot) => {
  const rawSlotCode =
    slot?.slotCode ||
    slot?.slot_code ||
    slot?.parkingSlotCode ||
    slot?.code ||
    slot?.slotName ||
    slot?.name;

  if (
    rawSlotCode !== undefined &&
    rawSlotCode !== null &&
    String(rawSlotCode).trim()
  ) {
    return String(rawSlotCode).trim();
  }

  if (slot?.slotNumber !== undefined && slot?.slotNumber !== null) {
    return `SLOT-${slot.slotNumber}`;
  }

  return `SLOT-${slot?.id || "UNKNOWN"}`;
};

const getVehicleTypeName = (slot) => {
  return (
    slot.vehicleType?.typeName ||
    slot.vehicleType?.vehicleTypeName ||
    slot.vehicleType?.name ||
    slot.vehicleTypeName ||
    slot.vehicleType ||
    slot.type ||
    "Unknown"
  );
};

const getVehicleType = (slot) => {
  return normalizeVehicleType(getVehicleTypeName(slot));
};

const getFloorCode = (slot) => {
  return (
    slot.zone?.floor?.floorName ||
    slot.zone?.floor?.floorCode ||
    slot.zone?.floor?.name ||
    slot.floorCode ||
    slot.floorName ||
    slot.floor?.floorCode ||
    slot.floor?.floorName ||
    slot.parkingFloor?.floorCode ||
    slot.parkingFloor?.floorName ||
    "Unknown"
  );
};

const normalizeFloorName = (floorName) => {
  return String(floorName || "Unknown").trim();
};

const isGroundFloor = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  return value === "G" || value === "GROUND" || value === "FLOOR G";
};

const getAllowedTypeByFloor = (floorName) => {
  if (isGroundFloor(floorName)) {
    return "motorbike";
  }

  return "car";
};

const getFloorSortValue = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  if (value === "G" || value === "FLOOR G" || value === "GROUND") {
    return 0;
  }

  const numberMatch = value.match(/\d+/);

  if (numberMatch) {
    return Number(numberMatch[0]);
  }

  if (value === "A" || value === "A1" || value === "F1") {
    return 1;
  }

  if (value === "C" || value === "A2" || value === "F2") {
    return 2;
  }

  return 999;
};

const getDisplayPrefixByFloor = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  if (value === "G" || value === "GROUND" || value === "FLOOR G") {
    return "G";
  }

  if (
    value === "1" ||
    value === "A" ||
    value === "A1" ||
    value === "F1" ||
    value === "FLOOR 1" ||
    value === "FLOOR A" ||
    value === "FLOOR A1"
  ) {
    return "A";
  }

  if (
    value === "2" ||
    value === "C" ||
    value === "A2" ||
    value === "F2" ||
    value === "FLOOR 2" ||
    value === "FLOOR C" ||
    value === "FLOOR A2"
  ) {
    return "C";
  }

  return "S";
};

const buildSlotDisplayMap = (slots) => {
  const mappedSlots = slots
    .map((slot) => ({
      id: slot.id,
      slotCode: getSlotCode(slot),
      floor: getFloorCode(slot),
      type: getVehicleType(slot),
      raw: slot
    }))
    .filter((slot) => {
      const allowedType = getAllowedTypeByFloor(slot.floor);

      if (slot.floor === "Unknown") {
        return true;
      }

      return slot.type === allowedType;
    })
    .sort((slotA, slotB) => {
      const floorCompare =
        getFloorSortValue(slotA.floor) - getFloorSortValue(slotB.floor);

      if (floorCompare !== 0) {
        return floorCompare;
      }

      return Number(slotA.id) - Number(slotB.id);
    });

  const floorCounters = new Map();
  const displayMap = new Map();

  mappedSlots.forEach((slot) => {
    const floorKey = slot.floor || "Unknown";
    const currentCount = floorCounters.get(floorKey) || 0;
    const nextNumber = currentCount + 1;

    floorCounters.set(floorKey, nextNumber);

    const prefix = getDisplayPrefixByFloor(slot.floor);
    const displayCode = `${prefix}-${String(nextNumber).padStart(2, "0")}`;

    displayMap.set(Number(slot.id), displayCode);
  });

  return displayMap;
};

const getDisplayVehicleType = (type) => {
  if (type === "motorbike") return "Motorbike";
  if (type === "car") return "Car";

  return type || "Unknown";
};

const mapApiSlotToOption = (slot, slotDisplayMap = new Map()) => {
  const normalizedType = getVehicleType(slot);
  const slotId = Number(slot.id);

  return {
    id: slot.id,
    slotCode: getSlotCode(slot),
    displayCode: slotDisplayMap.get(slotId) || getSlotCode(slot),
    floor: getFloorCode(slot),
    type: normalizedType,
    typeLabel: getDisplayVehicleType(normalizedType),
    status: String(slot.status || "AVAILABLE").toUpperCase(),
    raw: slot
  };
};

const padNumber = (value) => String(value).padStart(2, "0");

const formatDateValue = (date) => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;
};

const formatTimeValue = (date) => {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
};

const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return "";

  return `${dateValue}T${timeValue}`;
};

const normalizeDateTimeForBackend = (dateValue, timeValue) => {
  const combined = combineDateAndTime(dateValue, timeValue);

  if (!combined) return "";

  return `${combined}:00`;
};

const formatDisplayDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return "Not selected";

  const date = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(date.getTime())) return "Not selected";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  });
};

const formatDurationText = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return "0 minutes";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

function Booking() {
  const navigate = useNavigate();
  const slotDropdownRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, data: null });

  const getInitialTimeState = () => {
    const now = new Date();

    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
    now.setSeconds(0);
    now.setMilliseconds(0);

    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return {
      startDate: formatDateValue(now),
      startTime: formatTimeValue(now),
      endDate: formatDateValue(end),
      endTime: formatTimeValue(end)
    };
  };

  const initialTimeState = getInitialTimeState();

  const [formData, setFormData] = useState({
    vehicleTypeId: "1",
    vehicleType: "CAR",
    slotId: "",
    licensePlate: "",
    startDate: initialTimeState.startDate,
    startTime: initialTimeState.startTime,
    endDate: initialTimeState.endDate,
    endTime: initialTimeState.endTime
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState(0);
  const [totalEstimated, setTotalEstimated] = useState(0);
  const [timeError, setTimeError] = useState("");

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

  const selectedSlot = useMemo(() => {
    return availableSlots.find(
      (slot) => String(slot.id) === String(formData.slotId)
    );
  }, [availableSlots, formData.slotId]);

  const startDateTime = useMemo(() => {
    const combined = combineDateAndTime(formData.startDate, formData.startTime);
    return combined ? new Date(combined) : null;
  }, [formData.startDate, formData.startTime]);

  const endDateTime = useMemo(() => {
    const combined = combineDateAndTime(formData.endDate, formData.endTime);
    return combined ? new Date(combined) : null;
  }, [formData.endDate, formData.endTime]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVehicleTypeChange = (vehicleType) => {
    const vehicleTypeId = vehicleType === "CAR" ? "1" : "2";

    setIsSlotDropdownOpen(false);

    setFormData((prev) => ({
      ...prev,
      vehicleType,
      vehicleTypeId,
      slotId: "",
      licensePlate: ""
    }));
  };

  const handleSelectSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      slotId: String(slot.id)
    }));

    setIsSlotDropdownOpen(false);
  };

  const handleSelectSlot = (slot) => {
    setFormData((prev) => ({
      ...prev,
      slotId: String(slot.id)
    }));

    setIsSlotDropdownOpen(false);
  };

  const handleLicensePlateChange = (event) => {
    const formattedPlate = formatPlateByVehicleType(
      event.target.value,
      formData.vehicleType
    );

    setFormData((prev) => ({
      ...prev,
      licensePlate: formattedPlate
    }));
  };

  const applyQuickDuration = (hours) => {
    const baseStart =
      startDateTime && !Number.isNaN(startDateTime.getTime())
        ? startDateTime
        : new Date();

    const nextEnd = new Date(baseStart.getTime() + hours * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      startDate: formatDateValue(baseStart),
      startTime: formatTimeValue(baseStart),
      endDate: formatDateValue(nextEnd),
      endTime: formatTimeValue(nextEnd)
    }));
  };

  const applyFullDay = () => {
    const baseStart =
      startDateTime && !Number.isNaN(startDateTime.getTime())
        ? startDateTime
        : new Date();

    const nextEnd = new Date(baseStart);
    nextEnd.setHours(23, 59, 0, 0);

    if (nextEnd <= baseStart) {
      nextEnd.setDate(nextEnd.getDate() + 1);
    }

    setFormData((prev) => ({
      ...prev,
      startDate: formatDateValue(baseStart),
      startTime: formatTimeValue(baseStart),
      endDate: formatDateValue(nextEnd),
      endTime: formatTimeValue(nextEnd)
    }));
  };

  const loadAvailableSlots = async (vehicleTypeId) => {
    if (!vehicleTypeId) {
      setAvailableSlots([]);
      return;
    }

    try {
      setSlotsLoading(true);
      setSlotsError("");

      const [allSlotsResponse, availableSlotsResponse] = await Promise.all([
        axiosClient.get("/parking-slots"),
        axiosClient.get(`/parking-slots/available/vehicle-type/${vehicleTypeId}`)
      ]);

      const allSlotsPayload = allSlotsResponse.data;
      const allSlots = Array.isArray(allSlotsPayload)
        ? allSlotsPayload
        : allSlotsPayload.content ||
          allSlotsPayload.data ||
          allSlotsPayload.slots ||
          [];

      const slotDisplayMap = buildSlotDisplayMap(allSlots);

      const availablePayload = availableSlotsResponse.data;
      const availableRawSlots = Array.isArray(availablePayload)
        ? availablePayload
        : availablePayload.content ||
          availablePayload.data ||
          availablePayload.slots ||
          [];

      const mappedSlots = availableRawSlots
        .map((slot) => mapApiSlotToOption(slot, slotDisplayMap))
        .filter((slot) => slot.status === "AVAILABLE")
        .sort((slotA, slotB) => {
          const codeCompare = slotA.displayCode.localeCompare(
            slotB.displayCode,
            undefined,
            { numeric: true, sensitivity: "base" }
          );

          if (codeCompare !== 0) {
            return codeCompare;
          }

          return Number(slotA.id) - Number(slotB.id);
        });

      setAvailableSlots(mappedSlots);

      setFormData((prev) => {
        const selectedStillExists = mappedSlots.some(
          (slot) => String(slot.id) === String(prev.slotId)
        );

        return {
          ...prev,
          slotId: selectedStillExists ? prev.slotId : ""
        };
      });
    } catch (error) {
      console.error("Failed to load available slots:", error);
      setAvailableSlots([]);
      setSlotsError("Không thể tải danh sách slot còn trống. Vui lòng thử lại.");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableSlots(formData.vehicleTypeId);
  }, [formData.vehicleTypeId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        slotDropdownRef.current &&
        !slotDropdownRef.current.contains(event.target)
      ) {
        setIsSlotDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (
      formData.startDate &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime
    ) {
      if (!startDateTime || !endDateTime) {
        setDurationMinutes(0);
        setTotalEstimated(0);
        setTimeError("Invalid parking time.");
        return;
      }

      if (endDateTime > startDateTime) {
        const diffInMs = endDateTime - startDateTime;
        const calculatedMinutes = Math.round(diffInMs / (1000 * 60));
        const calculatedHoursForFee = calculatedMinutes / 60;
        const ratePerHour = formData.vehicleType === "CAR" ? 5000 : 4000;

        setDurationMinutes(calculatedMinutes);
        setTotalEstimated(Math.round(calculatedHoursForFee * ratePerHour));
        setTimeError("");
      } else {
        setDurationMinutes(0);
        setTotalEstimated(0);
        setTimeError("End time must be later than start time.");
      }
    } else {
      setDurationMinutes(0);
      setTotalEstimated(0);
      setTimeError("Please select both start and end time.");
    }
  }, [
    formData.startDate,
    formData.startTime,
    formData.endDate,
    formData.endTime,
    formData.vehicleType,
    startDateTime,
    endDateTime
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!currentUserId) {
      alert("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }

    if (!formData.vehicleTypeId) {
      alert("Vui lòng chọn loại xe.");
      return;
    }

    if (!formData.slotId) {
      alert("Vui lòng chọn slot còn trống.");
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

    if (
      !formData.startDate ||
      !formData.startTime ||
      !formData.endDate ||
      !formData.endTime
    ) {
      alert("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      return;
    }

    if (
      timeError ||
      !startDateTime ||
      !endDateTime ||
      endDateTime <= startDateTime
    ) {
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
        startTime: normalizeDateTimeForBackend(
          formData.startDate,
          formData.startTime
        ),
        endTime: normalizeDateTimeForBackend(formData.endDate, formData.endTime)
      };

      await bookingApi.createBooking(payload);

      setSuccessModal({
        show: true,
        data: {
          ...payload,
          vehicleType: formData.vehicleType,
          slotDisplayCode:
            selectedSlot?.displayCode || `Slot ID ${formData.slotId}`,
          durationText: formatDurationText(durationMinutes)
        }
      });
    } catch (error) {
      console.error("Create booking failed:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Tạo booking thất bại."
      );
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
              background: var(--bg-dashboard);
              min-height: 100vh;
              box-sizing: border-box;
              color: var(--text-main);
            }

            .booking-page {
              color: var(--text-main);
              font-family: system-ui, -apple-system, sans-serif;
            }

            .booking-header {
              margin-bottom: 2rem;
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 0.85rem;
              padding: 1.5rem;
              box-sizing: border-box;
              box-shadow: var(--shadow-card);
            }

            .booking-title-block h1 {
              margin: 0;
              font-size: 1.75rem;
              font-weight: 800;
              color: var(--text-main);
              letter-spacing: -0.03em;
            }

            .booking-title-block p {
              margin: 0.5rem 0 0 0;
              color: var(--text-muted);
              font-size: 0.95rem;
              line-height: 1.5;
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
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 0.85rem;
              padding: 1.5rem;
              box-sizing: border-box;
              box-shadow: var(--shadow-card);
            }

            .block-section-tag {
              font-size: 0.75rem;
              color: var(--text-muted);
              font-weight: 800;
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
              color: var(--text-muted);
              font-size: 0.7rem;
              font-weight: 800;
              text-transform: uppercase;
            }

            .input-wrapper {
              display: flex;
              align-items: center;
              gap: 0.65rem;
              background: var(--bg-input);
              border: 1px solid var(--border-color);
              border-radius: 0.55rem;
              padding: 0 0.75rem;
              min-height: 44px;
              transition: 0.2s ease;
              box-sizing: border-box;
              width: 100%;
            }

            .input-wrapper:focus-within {
              border-color: var(--primary-blue);
              box-shadow: 0 0 0 3px var(--primary-blue-soft);
            }

            .input-wrapper svg {
              color: var(--text-muted);
              flex-shrink: 0;
            }

            .input-wrapper input {
              width: 100%;
              border: none;
              outline: none;
              background: transparent;
              color: var(--text-main);
              font-size: 0.85rem;
              font-family: inherit;
              box-sizing: border-box;
              font-weight: 650;
            }

            .input-wrapper input::placeholder {
              color: var(--text-muted);
            }

            .input-wrapper input:read-only {
              color: var(--text-muted);
              cursor: not-allowed;
            }

            body:not(.light-mode) .input-wrapper input[type="date"],
            body:not(.light-mode) .input-wrapper input[type="time"] {
              color-scheme: dark;
            }

            body.light-mode .input-wrapper input[type="date"],
            body.light-mode .input-wrapper input[type="time"] {
              color-scheme: light;
            }

            .custom-slot-dropdown {
              position: relative;
              width: 100%;
            }

            .custom-slot-trigger {
              width: 100%;
              height: 42px;
              border: none;
              outline: none;
              background: transparent;
              color: var(--text-main);
              font-size: 0.85rem;
              font-family: inherit;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.65rem;
              cursor: pointer;
              text-align: left;
              padding: 0;
              font-weight: 650;
            }

            .custom-slot-trigger:disabled {
              color: var(--text-muted);
              cursor: not-allowed;
            }

            .custom-slot-trigger-placeholder {
              color: var(--text-muted);
            }

            .custom-slot-menu {
              position: absolute;
              top: calc(100% + 0.45rem);
              left: -2.15rem;
              right: 0;
              z-index: 3000;
              max-height: 260px;
              overflow-y: auto;
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 0.65rem;
              box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
              padding: 0.35rem;
            }

            body:not(.light-mode) .custom-slot-menu {
              box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
            }

            .custom-slot-option {
              width: 100%;
              border: none;
              outline: none;
              background: transparent;
              color: var(--text-main);
              font-size: 0.85rem;
              font-family: inherit;
              text-align: left;
              padding: 0.65rem 0.75rem;
              border-radius: 0.5rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.75rem;
            }

            .custom-slot-option:hover,
            .custom-slot-option.active {
              background: var(--primary-blue-soft);
              color: var(--primary-blue);
            }

            .custom-slot-option-code {
              color: var(--text-main);
              font-weight: 800;
            }

            .custom-slot-option.active .custom-slot-option-code,
            .custom-slot-option:hover .custom-slot-option-code {
              color: var(--primary-blue);
            }

            .custom-slot-option-type {
              color: var(--text-muted);
              font-size: 0.75rem;
              font-weight: 650;
            }

            .custom-slot-empty {
              padding: 0.85rem;
              color: var(--text-muted);
              font-size: 0.82rem;
              text-align: center;
            }

            .field-helper-text,
            .plate-hint {
              color: var(--text-muted);
              font-size: 0.7rem;
              line-height: 1.4;
              margin-top: 0.25rem;
            }

            .field-error-text {
              color: var(--danger-red);
              font-size: 0.72rem;
              line-height: 1.4;
              margin-top: 0.25rem;
              font-weight: 800;
            }

            .vehicle-selector-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            }

            .vehicle-card-option {
              background: var(--bg-input);
              border: 1px solid var(--border-color);
              border-radius: 0.75rem;
              padding: 2.5rem 1rem;
              text-align: center;
              cursor: pointer;
              position: relative;
              transition: 0.2s;
              box-sizing: border-box;
            }

            .vehicle-card-option:hover {
              border-color: var(--primary-blue);
              background: var(--primary-blue-soft);
            }

            .vehicle-card-option.active {
              border-color: var(--primary-blue);
              background: var(--primary-blue-soft);
              box-shadow: 0 0 0 3px var(--primary-blue-soft);
            }

            .vehicle-card-title {
              margin: 0;
              color: var(--text-main);
              font-weight: 800;
              font-size: 1rem;
            }

            .vehicle-card-check-icon {
              position: absolute;
              top: 0.75rem;
              right: 0.75rem;
            }

            .time-section-header {
              grid-column: 1 / -1;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 1rem;
              padding-top: 0.25rem;
            }

            .time-section-header h4 {
              margin: 0;
              color: var(--text-main);
              font-size: 0.95rem;
              font-weight: 800;
            }

            .time-section-header p {
              margin: 0.25rem 0 0 0;
              color: var(--text-muted);
              font-size: 0.75rem;
              line-height: 1.4;
            }

            .quick-duration-row {
              grid-column: 1 / -1;
              display: flex;
              align-items: center;
              gap: 0.65rem;
              flex-wrap: wrap;
              margin-top: 0.25rem;
            }

            .quick-duration-label {
              color: var(--text-muted);
              font-size: 0.72rem;
              font-weight: 800;
              text-transform: uppercase;
              margin-right: 0.25rem;
            }

            .quick-duration-btn {
              border: 1px solid var(--border-color);
              background: var(--bg-input);
              color: var(--text-main);
              min-height: 34px;
              padding: 0 0.8rem;
              border-radius: 999px;
              cursor: pointer;
              font-size: 0.78rem;
              font-weight: 800;
              transition: 0.2s ease;
            }

            .quick-duration-btn:hover {
              border-color: var(--primary-blue);
              background: var(--primary-blue-soft);
              color: var(--primary-blue);
            }

            .time-error-box {
              grid-column: 1 / -1;
              background: var(--danger-red-soft);
              color: var(--danger-red);
              border: 1px solid rgba(239, 68, 68, 0.25);
              padding: 0.75rem 0.85rem;
              border-radius: 0.65rem;
              font-size: 0.78rem;
              font-weight: 800;
            }

            .summary-sidebar-panel {
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: 0.85rem;
              padding: 1.5rem;
              box-sizing: border-box;
              position: sticky;
              top: 1rem;
              box-shadow: var(--shadow-card);
            }

            .summary-title {
              color: var(--text-muted);
              margin: 0 0 1.5rem 0;
              font-size: 0.8rem;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .summary-divider {
              width: 100%;
              height: 1px;
              background: var(--border-color);
              margin: 1.25rem 0;
            }

            .summary-label {
              color: var(--text-muted);
            }

            .summary-value {
              color: var(--text-main);
              font-weight: 800;
              text-align: right;
              overflow-wrap: anywhere;
            }

            .summary-time-box {
              background: var(--bg-card-soft);
              border: 1px solid var(--border-color);
              border-radius: 0.7rem;
              padding: 0.8rem;
              margin-bottom: 1rem;
              display: grid;
              gap: 0.65rem;
            }

            .summary-time-row {
              display: flex;
              justify-content: space-between;
              gap: 1rem;
              font-size: 0.82rem;
              line-height: 1.35;
            }

            .summary-total-label {
              font-size: 0.75rem;
              color: var(--text-muted);
              font-weight: 800;
            }

            .summary-total-value {
              font-size: 1.6rem;
              color: var(--primary-blue);
              font-weight: 800;
              letter-spacing: -0.5px;
              text-align: right;
            }

            .submit-action-button {
              width: 100%;
              padding: 0.85rem;
              background: var(--primary-blue);
              color: #ffffff;
              border: none;
              border-radius: 0.6rem;
              cursor: pointer;
              font-size: 0.95rem;
              font-weight: 800;
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
              background: var(--bg-card-soft);
              color: var(--text-muted);
              cursor: not-allowed;
              box-shadow: none;
            }

            .booking-note-text {
              text-align: center;
              font-size: 0.7rem;
              color: var(--text-muted);
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
              background: rgba(3, 7, 18, 0.72);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2000;
              backdrop-filter: blur(4px);
              padding: 1rem;
            }

            .modal-content-card {
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              padding: 2.5rem 2rem;
              border-radius: 1rem;
              width: 440px;
              max-width: 100%;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
              position: relative;
              box-sizing: border-box;
              color: var(--text-main);
            }

            .modal-close-btn {
              position: absolute;
              top: 1rem;
              right: 1rem;
              background: transparent;
              border: none;
              color: var(--text-muted);
              cursor: pointer;
            }

            .modal-icon-circle {
              background: var(--success-green-soft);
              color: var(--success-green);
              width: 64px;
              height: 64px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem auto;
            }

            .modal-info-box {
              background: var(--bg-card-soft);
              border: 1px solid var(--border-color);
              padding: 1rem;
              border-radius: 0.6rem;
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
              gap: 1rem;
            }

            .modal-primary-btn {
              width: 100%;
              padding: 0.75rem;
              background: var(--success-green);
              color: #ffffff;
              border: none;
              border-radius: 0.6rem;
              cursor: pointer;
              font-weight: 800;
              font-size: 0.9rem;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
            }

            @media (max-width: 1024px) {
              .booking-grid-layout {
                grid-template-columns: 1fr;
              }

              .summary-sidebar-panel {
                position: static;
              }
            }

            @media (max-width: 768px) {
              .booking-inner-form,
              .vehicle-selector-grid {
                grid-template-columns: 1fr;
              }

              .time-section-header {
                flex-direction: column;
                align-items: flex-start;
              }
            }
          `}</style>

          <div className="booking-header">
            <div className="booking-title-block">
              <h1>New Booking</h1>
              <p>
                Create a new parking reservation. Select an available parking
                slot and enter the vehicle details to confirm the booking.
              </p>
            </div>
          </div>

          <div className="booking-grid-layout">
            <form className="form-section-container" onSubmit={handleSubmit}>
              <div className="booking-card-block">
                <span className="block-section-tag">1. Vehicle Type</span>

                <div className="vehicle-selector-grid">
                  <div
                    className={`vehicle-card-option ${
                      formData.vehicleType === "CAR" ? "active" : ""
                    }`}
                    onClick={() => handleVehicleTypeChange("CAR")}
                  >
                    <Car
                      size={32}
                      color={
                        formData.vehicleType === "CAR"
                          ? "#3b82f6"
                          : "var(--text-muted)"
                      }
                      style={{ margin: "0 auto 0.75rem auto" }}
                    />

                    <p className="vehicle-card-title">Car</p>

                    {formData.vehicleType === "CAR" && (
                      <CheckCircle2
                        size={18}
                        color="#3b82f6"
                        className="vehicle-card-check-icon"
                      />
                    )}
                  </div>

                  <div
                    className={`vehicle-card-option ${
                      formData.vehicleType === "MOTORBIKE" ? "active" : ""
                    }`}
                    onClick={() => handleVehicleTypeChange("MOTORBIKE")}
                  >
                    <Bike
                      size={32}
                      color={
                        formData.vehicleType === "MOTORBIKE"
                          ? "#3b82f6"
                          : "var(--text-muted)"
                      }
                      style={{ margin: "0 auto 0.75rem auto" }}
                    />

                    <p className="vehicle-card-title">Motorbike</p>

                    {formData.vehicleType === "MOTORBIKE" && (
                      <CheckCircle2
                        size={18}
                        color="#3b82f6"
                        className="vehicle-card-check-icon"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="booking-card-block">
                <span className="block-section-tag">
                  2. Reservation Details
                </span>

                <div className="booking-inner-form">
                  <div className="form-group">
                    <label>Current user</label>

                    <div className="input-wrapper">
                      <User size={14} />

                      <input
                        type="text"
                        value={
                          currentUser?.fullName ||
                          currentUser?.name ||
                          currentUser?.email ||
                          "Unknown user"
                        }
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
                    <label>Available slot</label>

                    <div className="input-wrapper">
                      <MapPin size={14} />

                      <div
                        className="custom-slot-dropdown"
                        ref={slotDropdownRef}
                      >
                        <button
                          type="button"
                          className="custom-slot-trigger"
                          onClick={() => {
                            if (!slotsLoading) {
                              setIsSlotDropdownOpen((prev) => !prev);
                            }
                          }}
                          disabled={slotsLoading}
                        >
                          <span
                            className={
                              !selectedSlot
                                ? "custom-slot-trigger-placeholder"
                                : ""
                            }
                          >
                            {slotsLoading
                              ? "Loading available slots..."
                              : selectedSlot
                                ? `${selectedSlot.displayCode} - ${selectedSlot.typeLabel}`
                                : "Select available slot"}
                          </span>

                          <ChevronDown size={16} />
                        </button>

                        {isSlotDropdownOpen && (
                          <div className="custom-slot-menu">
                            {availableSlots.length === 0 ? (
                              <div className="custom-slot-empty">
                                No available slots for this vehicle type.
                              </div>
                            ) : (
                              availableSlots.map((slot) => {
                                const isActive =
                                  String(slot.id) === String(formData.slotId);

                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    className={`custom-slot-option ${
                                      isActive ? "active" : ""
                                    }`}
                                    onClick={() => handleSelectSlot(slot)}
                                  >
                                    <span className="custom-slot-option-code">
                                      {slot.displayCode}
                                    </span>

                                    <span className="custom-slot-option-type">
                                      {slot.typeLabel}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {slotsError ? (
                      <small className="field-error-text">{slotsError}</small>
                    ) : (
                      <small className="field-helper-text">
                        Only available slots for the selected vehicle type are
                        shown.
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>License plate</label>

                    <div className="input-wrapper">
                      {formData.vehicleType === "CAR" ? (
                        <Car size={14} />
                      ) : (
                        <Bike size={14} />
                      )}

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

                  <div className="time-section-header">
                    <div>
                      <h4>Parking Time</h4>
                      <p>
                        Choose a start and end time using 24-hour format. You can
                        also use quick duration buttons.
                      </p>
                    </div>
                  </div>

                  <div className="quick-duration-row">
                    <span className="quick-duration-label">Quick select</span>

                    <button
                      type="button"
                      className="quick-duration-btn"
                      onClick={() => applyQuickDuration(1)}
                    >
                      +1 hour
                    </button>

                    <button
                      type="button"
                      className="quick-duration-btn"
                      onClick={() => applyQuickDuration(2)}
                    >
                      +2 hours
                    </button>

                    <button
                      type="button"
                      className="quick-duration-btn"
                      onClick={() => applyQuickDuration(4)}
                    >
                      +4 hours
                    </button>

                    <button
                      type="button"
                      className="quick-duration-btn"
                      onClick={applyFullDay}
                    >
                      Full day
                    </button>
                  </div>

                  <div className="form-group">
                    <label>Start date</label>

                    <div className="input-wrapper">
                      <CalendarDays size={14} />

                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Start time</label>

                    <div className="input-wrapper">
                      <Clock size={14} />

                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        step="300"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>End date</label>

                    <div className="input-wrapper">
                      <CalendarDays size={14} />

                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>End time</label>

                    <div className="input-wrapper">
                      <Clock size={14} />

                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        step="300"
                      />
                    </div>
                  </div>

                  {timeError && (
                    <div className="time-error-box">{timeError}</div>
                  )}
                </div>
              </div>
            </form>

            <div className="summary-sidebar-panel">
              <h3 className="summary-title">Reservation Summary</h3>

              <div
                className="info-box-row"
                style={{ fontSize: "0.9rem", marginBottom: "1rem" }}
              >
                <span className="summary-label">Vehicle Type</span>
                <span className="summary-value">{formData.vehicleType}</span>
              </div>

              <div
                className="info-box-row"
                style={{ fontSize: "0.9rem", marginBottom: "1rem" }}
              >
                <span className="summary-label">Selected Slot</span>
                <span className="summary-value">
                  {selectedSlot ? selectedSlot.displayCode : "Not selected"}
                </span>
              </div>

              <div
                className="info-box-row"
                style={{ fontSize: "0.9rem", marginBottom: "1rem" }}
              >
                <span className="summary-label">License Plate</span>
                <span className="summary-value">
                  {formData.licensePlate || "Not entered"}
                </span>
              </div>

              <div className="summary-time-box">
                <div className="summary-time-row">
                  <span className="summary-label">From</span>
                  <span className="summary-value">
                    {formatDisplayDateTime(
                      formData.startDate,
                      formData.startTime
                    )}
                  </span>
                </div>

                <div className="summary-time-row">
                  <span className="summary-label">To</span>
                  <span className="summary-value">
                    {formatDisplayDateTime(formData.endDate, formData.endTime)}
                  </span>
                </div>

                <div className="summary-time-row">
                  <span className="summary-label">Duration</span>
                  <span className="summary-value">
                    {formatDurationText(durationMinutes)}
                  </span>
                </div>
              </div>

              <div
                className="info-box-row"
                style={{ fontSize: "0.9rem", marginBottom: "1rem" }}
              >
                <span className="summary-label">Rate per Hour</span>
                <span className="summary-value">
                  {formData.vehicleType === "CAR" ? "5,000" : "4,000"} VNĐ
                </span>
              </div>

              <div className="summary-divider"></div>

              <div
                className="info-box-row"
                style={{ alignItems: "center", marginBottom: "1.75rem" }}
              >
                <span className="summary-total-label">TOTAL ESTIMATED</span>

                <span className="summary-total-value">
                  {totalEstimated.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>

              <button
                type="button"
                className="submit-action-button"
                disabled={isSubmitting || slotsLoading || Boolean(timeError)}
                onClick={handleSubmit}
              >
                <span>{isSubmitting ? "Creating..." : "Confirm Booking"}</span>
                <ArrowRight size={16} />
              </button>

              <p className="booking-note-text">
                After a booking is created successfully, the system will
                redirect you to the Reservations page for tracking and
                management.
              </p>
            </div>
          </div>
        </div>

        {successModal.show && (
          <div className="modal-overlay">
            <div className="modal-content-card">
              <button onClick={closeSuccessModal} className="modal-close-btn">
                <X size={18} />
              </button>

              <div className="modal-icon-circle">
                <CheckCircle2 size={36} />
              </div>

              <h3
                style={{
                  color: "var(--text-main)",
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.4rem",
                  fontWeight: "800"
                }}
              >
                Booking Confirmed!
              </h3>

              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  margin: "0 0 1.75rem 0",
                  lineHeight: "1.5"
                }}
              >
                Your parking reservation has been created successfully.
              </p>

              <div className="modal-info-box">
                <div className="info-box-row">
                  <span style={{ color: "var(--text-muted)" }}>
                    Vehicle Type:
                  </span>
                  <span
                    style={{
                      color: "var(--text-main)",
                      fontWeight: "700"
                    }}
                  >
                    {successModal.data?.vehicleType}
                  </span>
                </div>

                <div className="info-box-row">
                  <span style={{ color: "var(--text-muted)" }}>
                    Target Location:
                  </span>
                  <span
                    style={{
                      color: "var(--primary-blue)",
                      fontWeight: "800"
                    }}
                  >
                    {successModal.data?.slotDisplayCode}
                  </span>
                </div>

                <div className="info-box-row">
                  <span style={{ color: "var(--text-muted)" }}>
                    License Plate:
                  </span>
                  <span
                    style={{
                      color: "var(--success-green)",
                      fontWeight: "800"
                    }}
                  >
                    {successModal.data?.licensePlate}
                  </span>
                </div>

                <div className="info-box-row">
                  <span style={{ color: "var(--text-muted)" }}>Duration:</span>
                  <span
                    style={{
                      color: "var(--text-main)",
                      fontWeight: "800"
                    }}
                  >
                    {successModal.data?.durationText}
                  </span>
                </div>

                <div className="info-box-row">
                  <span style={{ color: "var(--text-muted)" }}>
                    Total Estimated:
                  </span>
                  <span
                    style={{
                      color: "var(--primary-blue)",
                      fontWeight: "800"
                    }}
                  >
                    {totalEstimated.toLocaleString("vi-VN")} VNĐ
                  </span>
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