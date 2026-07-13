import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  ChevronDown,
  Zap,
  ShieldCheck,
  Ban,
  LoaderCircle
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
  /*
   * Build display slot codes exactly like the Parking Floor screen.
   *
   * Important:
   * Do not filter by vehicle type here.
   * A floor can contain both Car and Motorbike slots.
   * If we filter motorbike slots out of Floor 1, the dropdown falls back
   * to raw database codes such as "1-BIKE-001".
   *
   * Example Floor 1:
   * A-01 ... A-60 = Car slots
   * A-61 ... A-70 = Motorbike slots
   */
  const mappedSlots = slots
    .map((slot) => ({
      id: Number(slot.id),
      slotCode: getSlotCode(slot),
      floor: getFloorCode(slot),
      type: getVehicleType(slot),
      raw: slot
    }))
    .filter((slot) => !Number.isNaN(slot.id))
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

const getDisplaySlotNumber = (displayCode) => {
  const match = String(displayCode || "").match(/\d+/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[0]);
};


const mapApiSlotToOption = (slot, slotDisplayMap = new Map()) => {
  const normalizedType = getVehicleType(slot);
  const slotId = Number(slot.id);
  const floor = getFloorCode(slot);
  const displayCode = slotDisplayMap.get(slotId) || getSlotCode(slot);

  return {
    id: slot.id,
    slotCode: getSlotCode(slot),
    displayCode,
    displayNumber: getDisplaySlotNumber(displayCode),
    floor,
    floorSort: getFloorSortValue(floor),
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

const getFallbackRatePerHour = (vehicleType) => {
  return vehicleType === "CAR" ? 5000 : 4000;
};

const toNumberMoney = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
};

const formatVnd = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
};

const formatApiDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false
  });
};

const formatCountdown = (totalSeconds) => {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const slotDropdownRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, data: null });
  const [paymentNotice, setPaymentNotice] = useState({
    show: false,
    type: "",
    message: ""
  });

  const [bookingPaymentStatus, setBookingPaymentStatus] = useState("IDLE");
  const [bookingPaymentMessage, setBookingPaymentMessage] = useState("");

  const [pendingBooking, setPendingBooking] = useState(null);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingRemainingSeconds, setPendingRemainingSeconds] = useState(0);
  const [isCancellingPendingCard, setIsCancellingPendingCard] =
    useState(false);

  const unwrapApiData = (response) => {
    return response?.data || response;
  };

  const getBookingIdFromResponse = (response) => {
    const data = unwrapApiData(response);

    return (
      data?.id ||
      data?.bookingId ||
      data?.booking?.id ||
      data?.data?.id ||
      data?.data?.bookingId
    );
  };

  const getPaymentQrImageSrc = (qrCode) => {
    /*
     * PayOS returns qrCode as the direct VietQR payment payload.
     * We render that payload directly in this modal.
     * Do not use checkoutUrl to generate QR, because that only opens PayOS page.
     */
    const qrValue = qrCode || "";

    if (!qrValue) {
      return "";
    }

    const normalizedQrValue = String(qrValue).trim();

    if (
      normalizedQrValue.startsWith("data:image") ||
      normalizedQrValue.startsWith("http://") ||
      normalizedQrValue.startsWith("https://")
    ) {
      return normalizedQrValue;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      normalizedQrValue
    )}&dark=000000&bgcolor=ffffff`;
  };

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

  const resetBookingForm = () => {
    const nextTimeState = getInitialTimeState();

    setFormData({
      vehicleTypeId: "1",
      vehicleType: "CAR",
      slotId: "",
      licensePlate: "",
      startDate: nextTimeState.startDate,
      startTime: nextTimeState.startTime,
      endDate: nextTimeState.endDate,
      endTime: nextTimeState.endTime
    });

    setIsSlotDropdownOpen(false);
  };

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [isSlotDropdownOpen, setIsSlotDropdownOpen] = useState(false);

  const [pricingPolicy, setPricingPolicy] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

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

  const getRemainingSeconds = (paymentExpiredAt) => {
    if (!paymentExpiredAt) return 0;

    const expirationTime = new Date(paymentExpiredAt).getTime();

    if (Number.isNaN(expirationTime)) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((expirationTime - Date.now()) / 1000)
    );
  };

  const buildPendingModalData = (booking) => {
    const duration =
      booking?.durationMinutes ||
      Math.max(
        0,
        Math.round(
          (new Date(booking?.endTime).getTime() -
            new Date(booking?.startTime).getTime()) /
            60000
        )
      );

    return {
      bookingId: booking?.id,
      bookingStatus: booking?.status || "PENDING_PAYMENT",
      paymentStatus: booking?.paymentStatus || "PENDING",
      licensePlate: booking?.licensePlate || "-",
      slotId: booking?.slotId,
      slotDisplayCode: booking?.slotCode || `Slot ID ${booking?.slotId || "-"}`,
      vehicleType: normalizeVehicleType(
        booking?.vehicleTypeName
      ).toUpperCase(),
      durationText: formatDurationText(duration),
      amount: booking?.paymentAmount || 0,
      currency: booking?.paymentCurrency || "VND",
      orderCode: booking?.paymentOrderCode || null,
      paymentLinkId: booking?.paymentLinkId || "",
      checkoutUrl: booking?.checkoutUrl || "",
      qrCode: booking?.qrCode || "",
      qrImageSrc: getPaymentQrImageSrc(booking?.qrCode),
      paymentExpiredAt: booking?.paymentExpiredAt,
      displayStartTime: formatApiDateTime(booking?.startTime),
      displayEndTime: formatApiDateTime(booking?.endTime),
      pricePerHour: 0
    };
  };

  const loadPendingPayment = async () => {
    if (!currentUserId) {
      setPendingBooking(null);
      setPendingLoading(false);
      return;
    }

    try {
      setPendingLoading(true);

      const response = await axiosClient.get(
        "/bookings/my-pending-payment"
      );

      const booking = unwrapApiData(response);

      if (!booking || !booking.id) {
        setPendingBooking(null);
        setPendingRemainingSeconds(0);
        return;
      }

      setPendingBooking(booking);
      setPendingRemainingSeconds(
        getRemainingSeconds(booking.paymentExpiredAt)
      );
    } catch (error) {
      if (error.response?.status !== 204) {
        console.error(
          "Failed to load pending payment booking:",
          error
        );
      }

      setPendingBooking(null);
      setPendingRemainingSeconds(0);
    } finally {
      setPendingLoading(false);
    }
  };

  const selectedSlot = useMemo(() => {
    return availableSlots.find(
      (slot) => String(slot.id) === String(formData.slotId)
    );
  }, [availableSlots, formData.slotId]);

  const currentRatePerHour = useMemo(() => {
    const apiPrice = toNumberMoney(pricingPolicy?.pricePerHour);

    if (apiPrice > 0) {
      return apiPrice;
    }

    return getFallbackRatePerHour(formData.vehicleType);
  }, [pricingPolicy, formData.vehicleType]);

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

  const loadActivePricingPolicy = async (vehicleTypeId) => {
    if (!vehicleTypeId) {
      setPricingPolicy(null);
      setPricingError("");
      return;
    }

    try {
      setPricingLoading(true);
      setPricingError("");

      const response = await axiosClient.get(
        `/pricing-policies/active/vehicle-type/${vehicleTypeId}`
      );

      const data = unwrapApiData(response);

      setPricingPolicy(data || null);
    } catch (error) {
      console.error("Failed to load active pricing policy:", error);
      setPricingPolicy(null);
      setPricingError(
        "Không thể tải bảng giá mới nhất. Hệ thống đang dùng giá dự phòng."
      );
    } finally {
      setPricingLoading(false);
    }
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
          const floorCompare = Number(slotA.floorSort) - Number(slotB.floorSort);

          if (floorCompare !== 0) {
            return floorCompare;
          }

          const numberCompare =
            Number(slotA.displayNumber) - Number(slotB.displayNumber);

          if (numberCompare !== 0) {
            return numberCompare;
          }

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
    loadPendingPayment();
  }, [currentUserId]);

  useEffect(() => {
    if (!pendingBooking?.paymentExpiredAt) {
      setPendingRemainingSeconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      const remaining = getRemainingSeconds(
        pendingBooking.paymentExpiredAt
      );

      setPendingRemainingSeconds(remaining);

      if (remaining <= 0) {
        window.setTimeout(async () => {
          await loadPendingPayment();
          await loadAvailableSlots(formData.vehicleTypeId);
        }, 6000);
      }
    };

    updateCountdown();

    const intervalId = window.setInterval(
      updateCountdown,
      1000
    );

    return () => window.clearInterval(intervalId);
  }, [
    pendingBooking?.id,
    pendingBooking?.paymentExpiredAt,
    formData.vehicleTypeId
  ]);

  useEffect(() => {
    loadAvailableSlots(formData.vehicleTypeId);
    loadActivePricingPolicy(formData.vehicleTypeId);
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
        const calculatedHoursForFee = Math.ceil(calculatedMinutes / 60);
        const calculatedTotal = calculatedHoursForFee * currentRatePerHour;

        setDurationMinutes(calculatedMinutes);
        setTotalEstimated(calculatedTotal);
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
    currentRatePerHour,
    startDateTime,
    endDateTime
  ]);



  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentResult = searchParams.get("payment");
    const bookingId = searchParams.get("bookingId");

    if (!paymentResult || !bookingId) {
      return;
    }

    const processPaymentReturn = async () => {
      if (paymentResult === "success") {
        await checkBookingPaymentResult(bookingId);
      }

      if (paymentResult === "cancel") {
        try {
          await axiosClient.put(
            `/bookings/my-history/${bookingId}/cancel`
          );

          setPaymentNotice({
            show: true,
            type: "cancel",
            message: "Bạn đã hủy thanh toán và booking đã được hủy."
          });
        } catch (error) {
          console.error("Failed to cancel returned PayOS booking:", error);

          setPaymentNotice({
            show: true,
            type: "error",
            message:
              "Thanh toán đã được hủy nhưng hệ thống chưa thể hủy booking. Vui lòng thử lại trong Booking History."
          });
        }

        setSuccessModal({ show: false, data: null });
        setPendingBooking(null);
        setPendingRemainingSeconds(0);
        setBookingPaymentStatus("IDLE");
        setBookingPaymentMessage("");
        resetBookingForm();
        await loadAvailableSlots(formData.vehicleTypeId);
      }

      /*
       * Chỉ xóa query PayOS khỏi URL.
       * Người dùng vẫn ở nguyên màn hình New Booking.
       */
      navigate("/user-ui", { replace: true });
    };

    processPaymentReturn();
  }, [location.search]);

  const getBookingStatusValue = (booking) => {
    return String(
      booking?.status ||
        booking?.bookingStatus ||
        booking?.data?.status ||
        booking?.data?.bookingStatus ||
        ""
    ).toUpperCase();
  };

  const getPaymentStatusValue = (booking) => {
    return String(
      booking?.paymentStatus ||
        booking?.payment_status ||
        booking?.data?.paymentStatus ||
        booking?.data?.payment_status ||
        ""
    ).toUpperCase();
  };

  const isBookingPaymentSuccess = (booking) => {
    const bookingStatus = getBookingStatusValue(booking);
    const paymentStatus = getPaymentStatusValue(booking);

    return bookingStatus === "CONFIRMED" || paymentStatus === "PAID";
  };

  const markBookingPaymentSuccess = async (booking) => {
    const paidSlotId = successModal.data?.slotId;

    setBookingPaymentStatus("PAID");
    setBookingPaymentMessage("Đã thanh toán thành công");
    setPendingBooking(null);
    setPendingRemainingSeconds(0);

    setPaymentNotice({
      show: true,
      type: "success",
      message:
        "Đã thanh toán thành công. Booking đã được xác nhận và slot đã được giữ chỗ."
    });

    setSuccessModal((prev) => {
      if (!prev.show || !prev.data) {
        return prev;
      }

      return {
        show: true,
        data: {
          ...prev.data,
          bookingStatus: getBookingStatusValue(booking) || "CONFIRMED",
          paymentStatus: getPaymentStatusValue(booking) || "PAID"
        }
      };
    });

    await loadAvailableSlots(formData.vehicleTypeId);

    /*
     * Ẩn ngay slot vừa thanh toán khỏi danh sách chọn trên giao diện.
     * Backend vẫn phải là nguồn dữ liệu chính để Parking Floor hiển thị RESERVED.
     */
    if (paidSlotId) {
      setAvailableSlots((prev) =>
        prev.filter(
          (slot) => String(slot.id) !== String(paidSlotId)
        )
      );
    }

    /*
     * Giữ người dùng ở trang New Booking.
     * Sau khi hiển thị trạng thái thành công một lúc, đóng QR và reset form.
     */
    window.setTimeout(() => {
      setSuccessModal({ show: false, data: null });
      setPendingBooking(null);
      setPendingRemainingSeconds(0);
      setBookingPaymentStatus("IDLE");
      setBookingPaymentMessage("");
      resetBookingForm();
    }, 1500);
  };

  const checkBookingPaymentResult = async (bookingId) => {
    if (!bookingId) return;

    try {
      const response = await axiosClient.get(
        `/bookings/my-history/${bookingId}`
      );
      const booking = unwrapApiData(response);

      const bookingStatus = getBookingStatusValue(booking);
      const paymentStatus = getPaymentStatusValue(booking);

      if (bookingStatus === "CONFIRMED" || paymentStatus === "PAID") {
        setBookingPaymentStatus("PAID");
        setBookingPaymentMessage("Đã thanh toán thành công");
        setPendingBooking(null);
        setPendingRemainingSeconds(0);

        setPaymentNotice({
          show: true,
          type: "success",
          message:
            "Đã thanh toán thành công. Booking đã được xác nhận và slot đã được giữ chỗ."
        });

        setSuccessModal({ show: false, data: null });
        resetBookingForm();
        await loadAvailableSlots(formData.vehicleTypeId);
        return;
      }

      setPaymentNotice({
        show: true,
        type: "pending",
        message:
          "Hệ thống đã quay lại từ PayOS. Thanh toán đang được xác nhận, vui lòng chờ trong giây lát."
      });

      setSuccessModal({ show: false, data: null });
    } catch (error) {
      console.error("Failed to check booking payment result:", error);

      setPaymentNotice({
        show: true,
        type: "error",
        message:
          "Không thể kiểm tra trạng thái thanh toán. Vui lòng vào Booking History để kiểm tra lại."
      });
    }
  };

  useEffect(() => {
    const bookingId = successModal.data?.bookingId;

    if (
      !successModal.show ||
      !bookingId ||
      bookingPaymentStatus === "PAID"
    ) {
      return undefined;
    }

    let stopped = false;

    const checkPayment = async () => {
      try {
        const response = await axiosClient.get(
        `/bookings/my-history/${bookingId}`
      );
        const booking = unwrapApiData(response);

        if (stopped) {
          return;
        }

        if (isBookingPaymentSuccess(booking)) {
          await markBookingPaymentSuccess(booking);
          return;
        }

        setBookingPaymentStatus("PENDING");
        setBookingPaymentMessage("Đang chờ khách quét QR và chuyển khoản...");
      } catch (error) {
        if (!stopped) {
          setBookingPaymentStatus("PENDING");
          setBookingPaymentMessage("Đang chờ xác nhận thanh toán từ PayOS...");
        }
      }
    };

    checkPayment();

    const intervalId = window.setInterval(checkPayment, 3000);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [
    successModal.show,
    successModal.data?.bookingId,
    bookingPaymentStatus,
    formData.vehicleTypeId
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

      const bookingResponse = await bookingApi.createBooking(payload);
      const bookingData = unwrapApiData(bookingResponse);
      const bookingId = getBookingIdFromResponse(bookingResponse);

      if (!bookingId) {
        throw new Error("Không lấy được bookingId sau khi tạo booking.");
      }

      const paymentResponse = await axiosClient.post(
        `/payments/payos/create/${bookingId}`
      );

      const paymentData = unwrapApiData(paymentResponse);
      const paymentQrSrc = getPaymentQrImageSrc(paymentData?.qrCode);

      setBookingPaymentStatus("PENDING");
      setBookingPaymentMessage("Đang chờ khách quét QR và chuyển khoản...");

      setSuccessModal({
        show: true,
        data: {
          ...payload,
          bookingId,
          bookingStatus:
            paymentData?.bookingStatus ||
            bookingData?.status ||
            "PENDING_PAYMENT",
          paymentStatus: paymentData?.paymentStatus || "PENDING",
          vehicleType: formData.vehicleType,
          slotDisplayCode:
            selectedSlot?.displayCode || `Slot ID ${formData.slotId}`,
          durationText: formatDurationText(durationMinutes),
          displayStartTime: formatDisplayDateTime(
            formData.startDate,
            formData.startTime
          ),
          displayEndTime: formatDisplayDateTime(
            formData.endDate,
            formData.endTime
          ),
          paymentExpiredAt:
            bookingData?.paymentExpiredAt ||
            paymentData?.paymentExpiredAt ||
            null,
          pricePerHour: currentRatePerHour,
          amount: paymentData?.amount || totalEstimated,
          currency: paymentData?.currency || "VND",
          orderCode: paymentData?.orderCode || null,
          paymentLinkId: paymentData?.paymentLinkId || "",
          checkoutUrl: paymentData?.checkoutUrl || "",
          qrCode: paymentData?.qrCode || "",
          qrImageSrc: paymentQrSrc
        }
      });

      setPendingBooking({
        ...bookingData,
        ...paymentData,
        id: bookingId,
        bookingId,
        slotId: Number(formData.slotId),
        slotCode:
          selectedSlot?.displayCode ||
          bookingData?.slotCode ||
          `Slot ID ${formData.slotId}`,
        licensePlate: payload.licensePlate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        paymentExpiredAt:
          bookingData?.paymentExpiredAt ||
          paymentData?.paymentExpiredAt ||
          new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      setPendingRemainingSeconds(
        getRemainingSeconds(
          bookingData?.paymentExpiredAt ||
            paymentData?.paymentExpiredAt ||
            new Date(Date.now() + 10 * 60 * 1000).toISOString()
        )
      );
    } catch (error) {
      console.error("Create booking or PayOS payment failed:", error);

      if (error.response?.status === 409) {
        await loadPendingPayment();

        setPaymentNotice({
          show: true,
          type: "pending",
          message:
            error.response?.data?.message ||
            "Bạn đang có một giao dịch chờ thanh toán. Giao dịch được hiển thị bên dưới."
        });
      } else {
        alert(
          error.response?.data?.message ||
            error.response?.data ||
            error.message ||
            "Tạo booking hoặc tạo QR thanh toán thất bại."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModal({ show: false, data: null });
    setBookingPaymentStatus("IDLE");
    setBookingPaymentMessage("");
    setIsCancelling(false);
    resetBookingForm();

    /*
     * Không navigate sang Reservations hoặc Booking History.
     * Người dùng vẫn ở nguyên trang New Booking.
     */
  };

  const handleCancelBooking = async () => {
    const bookingId = successModal.data?.bookingId;

    if (!bookingId || isCancelling) {
      return;
    }

    const shouldCancel = window.confirm(
      "Bạn có chắc muốn hủy booking này không? Mã QR thanh toán sẽ không còn được sử dụng."
    );

    if (!shouldCancel) {
      return;
    }

    try {
      setIsCancelling(true);
      setBookingPaymentMessage("Đang hủy booking...");

      await axiosClient.put(
        `/bookings/my-history/${bookingId}/cancel`
      );

      setPaymentNotice({
        show: true,
        type: "cancel",
        message: "Booking đã được hủy thành công."
      });

      setSuccessModal({ show: false, data: null });
      setBookingPaymentStatus("IDLE");
      setBookingPaymentMessage("");
      resetBookingForm();

      await loadAvailableSlots(formData.vehicleTypeId);
    } catch (error) {
      console.error("Cancel booking failed:", error);

      const status = error.response?.status;

      if (status === 401) {
        setSuccessModal({ show: false, data: null });
        setBookingPaymentStatus("IDLE");
        setBookingPaymentMessage("");

        setPaymentNotice({
          show: true,
          type: "error",
          message:
            "Phiên đăng nhập đã hết hạn. Hệ thống đang chuyển bạn về trang đăng nhập."
        });
      } else if (status === 403) {
        setPaymentNotice({
          show: true,
          type: "error",
          message:
            "Tài khoản hiện tại không có quyền hủy booking này."
        });

        setBookingPaymentMessage(
          "Không có quyền hủy booking."
        );
      } else if (status === 409) {
        setPaymentNotice({
          show: true,
          type: "error",
          message:
            error.response?.data?.message ||
            "Booking đã được thanh toán hoặc không còn có thể hủy."
        });

        setBookingPaymentMessage(
          "Booking không còn có thể hủy."
        );
      } else {
        setPaymentNotice({
          show: true,
          type: "error",
          message:
            error.response?.data?.message ||
            error.response?.data ||
            "Không thể hủy booking. Vui lòng thử lại."
        });

        setBookingPaymentMessage(
          "Không thể hủy booking. Vui lòng thử lại."
        );
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleContinuePendingPayment = () => {
    if (!pendingBooking) {
      return;
    }

    setBookingPaymentStatus("PENDING");
    setBookingPaymentMessage(
      "Đang chờ khách quét QR và chuyển khoản..."
    );

    setSuccessModal({
      show: true,
      data: buildPendingModalData(pendingBooking)
    });
  };

  const handleCancelPendingCard = async () => {
    if (!pendingBooking?.id || isCancellingPendingCard) {
      return;
    }

    const shouldCancel = window.confirm(
      "Bạn có chắc muốn hủy giao dịch đang dang dở này không?"
    );

    if (!shouldCancel) {
      return;
    }

    try {
      setIsCancellingPendingCard(true);

      await axiosClient.put(
        `/bookings/my-history/${pendingBooking.id}/cancel`
      );

      setPendingBooking(null);
      setPendingRemainingSeconds(0);

      setPaymentNotice({
        show: true,
        type: "cancel",
        message: "Giao dịch đang dang dở đã được hủy."
      });

      await loadAvailableSlots(formData.vehicleTypeId);
    } catch (error) {
      console.error(
        "Cancel pending payment card failed:",
        error
      );

      setPaymentNotice({
        show: true,
        type: "error",
        message:
          error.response?.data?.message ||
          error.response?.data ||
          "Không thể hủy giao dịch đang dang dở."
      });

      await loadPendingPayment();
    } finally {
      setIsCancellingPendingCard(false);
    }
  };

  const handleModalClose = () => {
    if (bookingPaymentStatus === "PAID") {
      closeSuccessModal();
      return;
    }

    /*
     * Khi booking chưa thanh toán, đóng modal cũng phải đi qua
     * quy trình hủy để không tạo booking PENDING bị bỏ quên.
     */
    handleCancelBooking();
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

            .payment-notice {
              margin-bottom: 1rem;
              padding: 0.9rem 1rem;
              border-radius: 0.75rem;
              font-size: 0.9rem;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 1rem;
            }

            .payment-notice-success {
              border: 1px solid rgba(16, 185, 129, 0.35);
              background: rgba(16, 185, 129, 0.12);
              color: #10b981;
            }

            .payment-notice-cancel {
              border: 1px solid rgba(245, 158, 11, 0.35);
              background: rgba(245, 158, 11, 0.12);
              color: #f59e0b;
            }

            .payment-notice-pending {
              border: 1px solid rgba(59, 130, 246, 0.35);
              background: rgba(59, 130, 246, 0.12);
              color: #60a5fa;
            }

            .payment-notice-error {
              border: 1px solid rgba(239, 68, 68, 0.35);
              background: rgba(239, 68, 68, 0.12);
              color: #ef4444;
            }

            .payment-notice-close {
              border: none;
              background: transparent;
              color: inherit;
              cursor: pointer;
              font-weight: 900;
              font-size: 1rem;
            }

            .pending-payment-card {
              margin-top: 1.5rem;
              background: var(--bg-card);
              border: 1px solid rgba(245, 158, 11, 0.45);
              border-radius: 0.85rem;
              padding: 1.25rem 1.5rem;
              box-shadow: var(--shadow-card);
            }

            .pending-payment-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 1rem;
              margin-bottom: 1rem;
              flex-wrap: wrap;
            }

            .pending-payment-title {
              margin: 0;
              color: var(--text-main);
              font-size: 1rem;
              font-weight: 800;
            }

            .pending-payment-subtitle {
              margin: 0.35rem 0 0;
              color: var(--text-muted);
              font-size: 0.8rem;
              line-height: 1.45;
            }

            .pending-payment-countdown {
              min-width: 104px;
              text-align: center;
              padding: 0.55rem 0.8rem;
              border-radius: 0.65rem;
              background: rgba(245, 158, 11, 0.12);
              border: 1px solid rgba(245, 158, 11, 0.32);
              color: #f59e0b;
              font-size: 1.05rem;
              font-weight: 900;
              letter-spacing: 0.06em;
            }

            .pending-payment-grid {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 0.75rem;
            }

            .pending-payment-item {
              background: var(--bg-card-soft);
              border: 1px solid var(--border-color);
              border-radius: 0.65rem;
              padding: 0.8rem;
              min-width: 0;
            }

            .pending-payment-item-label {
              display: block;
              color: var(--text-muted);
              font-size: 0.67rem;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 0.35rem;
            }

            .pending-payment-item-value {
              color: var(--text-main);
              font-size: 0.84rem;
              font-weight: 800;
              overflow-wrap: anywhere;
            }

            .pending-payment-actions {
              display: flex;
              justify-content: flex-end;
              gap: 0.75rem;
              margin-top: 1rem;
              flex-wrap: wrap;
            }

            .pending-payment-button {
              min-height: 40px;
              padding: 0 1rem;
              border-radius: 0.6rem;
              font-size: 0.82rem;
              font-weight: 800;
              cursor: pointer;
            }

            .pending-payment-continue {
              border: none;
              background: var(--primary-blue);
              color: #ffffff;
            }

            .pending-payment-cancel {
              border: 1px solid rgba(239, 68, 68, 0.4);
              background: rgba(239, 68, 68, 0.1);
              color: var(--danger-red);
            }

            /* =======================================================
               CSS QUẢN LÝ ĐẢO MÀU MODAL THEO LIGHT/DARK MODE (TỰ ĐỘNG)
               ======================================================= */
            .pm-modal-card {
              background: #111827 !important;
              border: 1px solid rgba(59, 130, 246, 0.4) !important;
              box-shadow: 0 0 35px rgba(59, 130, 246, 0.55) !important;
            }
            .pm-text-title { color: #ffffff !important; }
            .pm-text-license { color: #ffffff !important; }
            .pm-text-label { color: #6b7280 !important; }
            .pm-text-value { color: #e5e7eb !important; }
            .pm-text-subrow { color: #9ca3af !important; }
            .pm-qr-box { 
              background: #1e293b !important; 
              border: 1px solid #334155 !important; 
            }

            /* Áp dụng khi body ở chế độ Light Mode (Sáng) */
            body.light-mode .pm-modal-card {
              background: var(--bg-card) !important;
              border: 1px solid var(--border-color) !important;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 0 15px rgba(59, 130, 246, 0.15) !important;
            }
            body.light-mode .pm-text-title { color: var(--text-main) !important; }
            body.light-mode .pm-text-license { color: var(--text-main) !important; }
            body.light-mode .pm-text-label { color: var(--text-muted) !important; }
            body.light-mode .pm-text-value { color: var(--text-main) !important; }
            body.light-mode .pm-text-subrow { color: var(--text-muted) !important; }
            body.light-mode .pm-qr-box { 
              background: var(--bg-card-soft) !important; 
              border: 1px solid var(--border-color) !important; 
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }

            @media (max-width: 1024px) {
              .booking-grid-layout {
                grid-template-columns: 1fr;
              }

              .summary-sidebar-panel {
                position: static;
              }

              .pending-payment-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }

            @media (max-width: 768px) {
              .booking-inner-form,
              .vehicle-selector-grid,
              .pending-payment-grid {
                grid-template-columns: 1fr;
              }

              .time-section-header {
                flex-direction: column;
                align-items: flex-start;
              }

              .pending-payment-actions {
                flex-direction: column;
              }

              .pending-payment-button {
                width: 100%;
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

          {paymentNotice.show && (
            <div className={`payment-notice payment-notice-${paymentNotice.type || "pending"}`}>
              <span>{paymentNotice.message}</span>

              <button
                type="button"
                className="payment-notice-close"
                onClick={() =>
                  setPaymentNotice({
                    show: false,
                    type: "",
                    message: ""
                  })
                }
              >
                ×
              </button>
            </div>
          )}

          <div className="booking-grid-layout">
            <form className="form-section-container" onSubmit={handleSubmit}>
              {/* Form inputs blocks... */}
              <div className="booking-card-block">
                <span className="block-section-tag">1. Vehicle Type</span>
                <div className="vehicle-selector-grid">
                  <div
                    className={`vehicle-card-option ${formData.vehicleType === "CAR" ? "active" : ""}`}
                    onClick={() => handleVehicleTypeChange("CAR")}
                  >
                    <Car
                      size={32}
                      color={formData.vehicleType === "CAR" ? "#3b82f6" : "var(--text-muted)"}
                      style={{ margin: "0 auto 0.75rem auto" }}
                    />
                    <p className="vehicle-card-title">Car</p>
                    {formData.vehicleType === "CAR" && (
                      <CheckCircle2 size={18} color="#3b82f6" className="vehicle-card-check-icon" />
                    )}
                  </div>

                  <div
                    className={`vehicle-card-option ${formData.vehicleType === "MOTORBIKE" ? "active" : ""}`}
                    onClick={() => handleVehicleTypeChange("MOTORBIKE")}
                  >
                    <Bike
                      size={32}
                      color={formData.vehicleType === "MOTORBIKE" ? "#3b82f6" : "var(--text-muted)"}
                      style={{ margin: "0 auto 0.75rem auto" }}
                    />
                    <p className="vehicle-card-title">Motorbike</p>
                    {formData.vehicleType === "MOTORBIKE" && (
                      <CheckCircle2 size={18} color="#3b82f6" className="vehicle-card-check-icon" />
                    )}
                  </div>
                </div>
              </div>

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
                    <label>Available slot</label>
                    <div className="input-wrapper">
                      <MapPin size={14} />
                      <div className="custom-slot-dropdown" ref={slotDropdownRef}>
                        <button
                          type="button"
                          className="custom-slot-trigger"
                          onClick={() => !slotsLoading && setIsSlotDropdownOpen((prev) => !prev)}
                          disabled={slotsLoading}
                        >
                          <span className={!selectedSlot ? "custom-slot-trigger-placeholder" : ""}>
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
                              <div className="custom-slot-empty">No available slots for this vehicle type.</div>
                            ) : (
                              availableSlots.map((slot) => {
                                const isActive = String(slot.id) === String(formData.slotId);
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    className={`custom-slot-option ${isActive ? "active" : ""}`}
                                    onClick={() => handleSelectSlot(slot)}
                                  >
                                    <span className="custom-slot-option-code">{slot.displayCode}</span>
                                    <span className="custom-slot-option-type">
                                      {slot.typeLabel}
                                      {slot.floor && slot.floor !== "Unknown" ? ` | ${slot.floor}` : ""}
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
                      <small className="field-helper-text">Only available slots for the selected vehicle type are shown.</small>
                    )}
                  </div>

                  <div className="form-group">
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
                    <small className="plate-hint">{getPlateHint(formData.vehicleType)}</small>
                  </div>

                  <div className="time-section-header">
                    <div>
                      <h4>Parking Time</h4>
                      <p>Choose a start and end time using 24-hour format. You can also use quick duration buttons.</p>
                    </div>
                  </div>

                  <div className="quick-duration-row">
                    <span className="quick-duration-label">Quick select</span>
                    <button type="button" className="quick-duration-btn" onClick={() => applyQuickDuration(1)}>+1 hour</button>
                    <button type="button" className="quick-duration-btn" onClick={() => applyQuickDuration(2)}>+2 hours</button>
                    <button type="button" className="quick-duration-btn" onClick={() => applyQuickDuration(4)}>+4 hours</button>
                    <button type="button" className="quick-duration-btn" onClick={applyFullDay}>Full day</button>
                  </div>

                  <div className="form-group">
                    <label>Start date</label>
                    <div className="input-wrapper">
                      <CalendarDays size={14} />
                      <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Start time</label>
                    <div className="input-wrapper">
                      <Clock size={14} />
                      <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} step="300" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>End date</label>
                    <div className="input-wrapper">
                      <CalendarDays size={14} />
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>End time</label>
                    <div className="input-wrapper">
                      <Clock size={14} />
                      <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} step="300" />
                    </div>
                  </div>

                  {timeError && <div className="time-error-box">{timeError}</div>}
                </div>
              </div>
            </form>

            {/* Sidebar Summary */}
            <div className="summary-sidebar-panel">
              <h3 className="summary-title">Reservation Summary</h3>
              <div className="summary-time-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span className="summary-label">Vehicle Type</span>
                <span className="summary-value">{formData.vehicleType}</span>
              </div>
              <div className="summary-time-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span className="summary-label">Selected Slot</span>
                <span className="summary-value">{selectedSlot ? selectedSlot.displayCode : "Not selected"}</span>
              </div>
              <div className="summary-time-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span className="summary-label">License Plate</span>
                <span className="summary-value">{formData.licensePlate || "Not entered"}</span>
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
                    {formatDisplayDateTime(
                      formData.endDate,
                      formData.endTime
                    )}
                  </span>
                </div>
                <div className="summary-time-row">
                  <span className="summary-label">Duration</span>
                  <span className="summary-value">{formatDurationText(durationMinutes)}</span>
                </div>
              </div>

              <div className="summary-time-row" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                <span className="summary-label">Rate per Hour</span>
                <span className="summary-value">
                  {pricingLoading ? "Loading..." : formatVnd(currentRatePerHour)}
                </span>
              </div>
              {pricingError && (
                <div className="field-error-text" style={{ marginBottom: "1rem" }}>
                  {pricingError}
                </div>
              )}
              <div className="summary-divider"></div>
              <div className="summary-time-row" style={{ alignItems: "center", marginBottom: "1.75rem" }}>
                <span className="summary-total-label">TOTAL ESTIMATED</span>
                <span className="summary-total-value">{formatVnd(totalEstimated)}</span>
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
              <p className="booking-note-text">After booking is created, the system will show the PayOS QR payment code.</p>
            </div>
          </div>

          <div className="pending-payment-card">
            <div className="pending-payment-header">
              <div>
                <h3 className="pending-payment-title">
                  Giao dịch đang dang dở
                </h3>
                <p className="pending-payment-subtitle">
                  Giao dịch chờ thanh toán được giữ trong 10 phút. Sau thời
                  gian này, booking sẽ tự động chuyển sang Cancelled và
                  payment sẽ chuyển sang Expired.
                </p>
              </div>

              {pendingBooking && (
                <div className="pending-payment-countdown">
                  {formatCountdown(pendingRemainingSeconds)}
                </div>
              )}
            </div>

            {pendingLoading ? (
              <div className="field-helper-text">
                Đang kiểm tra giao dịch chờ thanh toán...
              </div>
            ) : !pendingBooking ? (
              <div className="field-helper-text">
                Hiện không có giao dịch đang dang dở.
              </div>
            ) : (
              <>
                <div className="pending-payment-grid">
                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Booking
                    </span>
                    <span className="pending-payment-item-value">
                      {pendingBooking.bookingCode ||
                        `BK-${String(pendingBooking.id).padStart(6, "0")}`}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Biển số
                    </span>
                    <span className="pending-payment-item-value">
                      {pendingBooking.licensePlate || "-"}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Slot
                    </span>
                    <span className="pending-payment-item-value">
                      {pendingBooking.slotCode || "-"}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Trạng thái
                    </span>
                    <span className="pending-payment-item-value">
                      {pendingBooking.status} /{" "}
                      {pendingBooking.paymentStatus}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Số tiền
                    </span>
                    <span className="pending-payment-item-value">
                      {formatVnd(pendingBooking.paymentAmount)}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Bắt đầu
                    </span>
                    <span className="pending-payment-item-value">
                      {formatApiDateTime(pendingBooking.startTime)}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Kết thúc
                    </span>
                    <span className="pending-payment-item-value">
                      {formatApiDateTime(pendingBooking.endTime)}
                    </span>
                  </div>

                  <div className="pending-payment-item">
                    <span className="pending-payment-item-label">
                      Hết hạn thanh toán
                    </span>
                    <span className="pending-payment-item-value">
                      {formatApiDateTime(
                        pendingBooking.paymentExpiredAt
                      )}
                    </span>
                  </div>
                </div>

                <div className="pending-payment-actions">
                  <button
                    type="button"
                    className="pending-payment-button pending-payment-cancel"
                    onClick={handleCancelPendingCard}
                    disabled={isCancellingPendingCard}
                  >
                    {isCancellingPendingCard
                      ? "Đang hủy..."
                      : "Hủy booking"}
                  </button>

                  <button
                    type="button"
                    className="pending-payment-button pending-payment-continue"
                    onClick={handleContinuePendingPayment}
                    disabled={
                      pendingRemainingSeconds <= 0 ||
                      !pendingBooking.qrCode
                    }
                  >
                    Tiếp tục thanh toán
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==========================================
            OVERLAY MODAL FIXED FOR LIGHT & DARK MODE
           ========================================== */}
        {successModal.show && successModal.data && (
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(10, 15, 30, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              backdropFilter: "blur(4px)",
              padding: "1rem"
            }}
          >
            <div
              className="pm-modal-card"
              style={{
                padding: "2rem",
                borderRadius: "1rem",
                width: "720px",
                maxWidth: "100%",
                position: "relative",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                transition: "all 0.25s ease"
              }}
            >
              {/* Close Button X */}
              <button
                onClick={handleModalClose}
                style={{
                  position: "absolute",
                  top: "1.25rem", right: "1.25rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af"
                }}
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <h3 className="pm-text-title" style={{ marginTop: 0, fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem" }}>
                Booking & QR Payment
              </h3>

              {/* Two Column Content Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2.5rem" }}>
                
                {/* LEFT DETAILS PANEL */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="pm-text-license" style={{ fontSize: "1.8rem", fontWeight: "800", letterSpacing: "0.5px" }}>
                      {successModal.data.licensePlate}
                    </span>
                    <span
                      style={{
                        background:
                          bookingPaymentStatus === "PAID"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color: bookingPaymentStatus === "PAID" ? "#10b981" : "#f59e0b",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.72rem",
                        fontWeight: "700"
                      }}
                    >
                      {bookingPaymentStatus === "PAID" ? "PAID" : successModal.data.paymentStatus || "PENDING"}
                    </span>
                  </div>

                  <div className="pm-text-subrow" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Slot: {successModal.data.slotDisplayCode || "N/A"}
                  </div>

                  {/* Metadata 2x2 Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 1rem", marginTop: "1.5rem" }}>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>START TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {successModal.data?.displayStartTime ||
                          formatDisplayDateTime(
                            formData.startDate,
                            formData.startTime
                          )}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>END TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {successModal.data?.displayEndTime ||
                          formatDisplayDateTime(
                            formData.endDate,
                            formData.endTime
                          )}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>DURATION</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {successModal.data.durationText}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>PRICE PER HOUR</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {formatVnd(successModal.data.pricePerHour || currentRatePerHour)} / giờ
                      </div>
                    </div>
                  </div>

                  {/* Price breakdown block */}
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span className="pm-text-subrow">Reservation Fee</span>
                      <span className="pm-text-title" style={{ fontWeight: "600" }}>{formatVnd(successModal.data.amount || totalEstimated)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span className="pm-text-subrow">Service Charge</span>
                      <span className="pm-text-title" style={{ fontWeight: "600" }}>0 VNĐ</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", borderTop: "1px dashed rgba(128,128,128,0.3)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                      <span className="pm-text-title">Total Amount</span>
                      <span style={{ color: "#10b981", fontSize: "1.25rem", fontWeight: "800" }}>
                        {formatVnd(successModal.data.amount || totalEstimated)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT QR PAYMENT CODE PANEL */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="pm-text-title" style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", textAlign: "center" }}>
                    {bookingPaymentStatus === "PAID" ? "Đã thanh toán thành công" : "Scan QR Code for Payment"}
                  </div>

                  <div
                    className="pm-qr-box"
                    style={{
                      padding: "1.25rem",
                      borderRadius: "0.75rem",
                      display: "inline-block"
                    }}
                  >
                    {/* Hộp màu trắng bao quanh mã QR luôn cố định để chống lỗi lóa mắt / đảo ngược màu */}
                    <div style={{ background: "#ffffff", padding: "0.5rem", borderRadius: "0.4rem", display: "block" }}>
                      {successModal.data.qrImageSrc ? (
                        <img
                          src={successModal.data.qrImageSrc}
                          alt="PayOS QR payment code"
                          style={{ display: "block" }}
                          width={220}
                          height={220}
                        />
                      ) : (
                        <div
                          style={{
                            width: 220,
                            height: 220,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#111827",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textAlign: "center"
                          }}
                        >
                          QR unavailable
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pm-text-subrow" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: "1rem", maxWidth: "220px", lineHeight: "1.4" }}>
                    Please scan the PayOS QR code to complete your parking payment.
                  </div>

                  {successModal.data.orderCode && (
                    <div className="pm-text-subrow" style={{ fontSize: "0.72rem", textAlign: "center", marginTop: "0.6rem", maxWidth: "240px", lineHeight: "1.4" }}>
                      Order code: {successModal.data.orderCode}
                    </div>
                  )}

                  {bookingPaymentStatus !== "PAID" &&
                    successModal.data.paymentExpiredAt && (
                      <div
                        style={{
                          marginTop: "0.65rem",
                          color: "#f59e0b",
                          fontSize: "0.78rem",
                          fontWeight: 800
                        }}
                      >
                        Còn lại:{" "}
                        {formatCountdown(
                          getRemainingSeconds(
                            successModal.data.paymentExpiredAt
                          )
                        )}
                      </div>
                    )}

                  <div
                    style={{
                      marginTop: "1rem",
                      width: "100%",
                      borderRadius: "0.75rem",
                      padding: "0.85rem 1rem",
                      background:
                        bookingPaymentStatus === "PAID"
                          ? "rgba(16, 185, 129, 0.14)"
                          : "rgba(59, 130, 246, 0.12)",
                      border:
                        bookingPaymentStatus === "PAID"
                          ? "1px solid rgba(16, 185, 129, 0.35)"
                          : "1px solid rgba(96, 165, 250, 0.3)",
                      color: bookingPaymentStatus === "PAID" ? "#10b981" : "#60a5fa",
                      fontSize: "0.86rem",
                      fontWeight: 800,
                      textAlign: "center",
                      lineHeight: 1.35
                    }}
                  >
                    {bookingPaymentStatus === "PAID" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                        <CheckCircle2 size={18} />
                        Đã thanh toán thành công
                      </span>
                    ) : (
                      bookingPaymentMessage || "Đang chờ thanh toán..."
                    )}
                  </div>

                  {false && successModal.data.checkoutUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.assign(successModal.data.checkoutUrl);
                      }}
                      style={{
                        marginTop: "1rem",
                        width: "100%",
                        border: "none",
                        borderRadius: "0.6rem",
                        padding: "0.75rem 0.9rem",
                        background: "#10b981",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      Open PayOS Checkout
                    </button>
                  )}

                  {/* Verification Badges Section */}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1rem", width: "100%", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <Zap size={13} fill="#60a5fa" /> Instant Confirmation
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <ShieldCheck size={13} fill="transparent" /> Secure Payment
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      width: "100%",
                      marginTop: "1.15rem"
                    }}
                  >
                    {bookingPaymentStatus === "PAID" ? (
                      <button
                        type="button"
                        onClick={closeSuccessModal}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: "0.65rem",
                          padding: "0.8rem 1rem",
                          background: "#3b82f6",
                          color: "#ffffff",
                          fontSize: "0.86rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        Trở lại New Booking
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        disabled={isCancelling}
                        style={{
                          width: "100%",
                          border: "1px solid rgba(239, 68, 68, 0.45)",
                          borderRadius: "0.65rem",
                          padding: "0.8rem 1rem",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                          fontSize: "0.86rem",
                          fontWeight: 800,
                          cursor: isCancelling ? "not-allowed" : "pointer",
                          opacity: isCancelling ? 0.65 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem"
                        }}
                      >
                        {isCancelling ? (
                          <LoaderCircle
                            size={17}
                            style={{ animation: "spin 0.8s linear infinite" }}
                          />
                        ) : (
                          <Ban size={17} />
                        )}

                        {isCancelling
                          ? "Đang hủy Booking..."
                          : "Hủy Booking"}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Booking;