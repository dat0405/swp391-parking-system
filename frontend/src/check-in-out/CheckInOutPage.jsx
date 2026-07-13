import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { SquarePlay, LogOut, ReceiptText, X, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";
import { parkingSessionApi } from "../api/parkingSessionApi";
import { Html5Qrcode } from "html5-qrcode";
import axiosClient from "../api/axiosClient";

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  border: "var(--border-color)",
  borderSoft: "var(--border-soft)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  shadow: "var(--shadow-card)"
};

function CheckInOutPage() {
  const generateTicketId = () =>
    `TK-${Math.floor(100000 + Math.random() * 900000)}`;

  const [floorsData, setFloorsData] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  const [licensePlateIn, setLicensePlateIn] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [entryTime, setEntryTime] = useState("--:--:--");
  const [ticketId, setTicketId] = useState(() => generateTicketId());
  const [ticketQrModal, setTicketQrModal] = useState({
    show: false,
    data: null
  });

  const [checkInPlateImage, setCheckInPlateImage] = useState({
    previewUrl: "",
    fileName: "",
    message: ""
  });
  const [checkInPlateInputKey, setCheckInPlateInputKey] = useState(0);
  const [checkInOcrLoading, setCheckInOcrLoading] = useState(false);
  const [checkInOcrProgress, setCheckInOcrProgress] = useState(0);

  const [checkOutPlateImage, setCheckOutPlateImage] = useState({
    previewUrl: "",
    fileName: "",
    message: ""
  });
  const [checkOutPlateInputKey, setCheckOutPlateInputKey] = useState(0);
  const [checkOutOcrLoading, setCheckOutOcrLoading] = useState(false);
  const [checkOutOcrProgress, setCheckOutOcrProgress] = useState(0);

  const [searchPlate, setSearchPlate] = useState("");
  const [searchTicketId, setSearchTicketId] = useState("");
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkoutLostTicket, setCheckoutLostTicket] = useState(false);
  const [checkoutPlateScanned, setCheckoutPlateScanned] = useState(false);
  const [activeVehicleSearch, setActiveVehicleSearch] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutPaymentData, setCheckoutPaymentData] = useState(null);
  const [checkoutPaymentStatus, setCheckoutPaymentStatus] = useState("IDLE");
  const [checkoutPaymentMessage, setCheckoutPaymentMessage] = useState("");
  const [checkoutFinalized, setCheckoutFinalized] = useState(false);

  const ticketScannerElementId = "ticket-qr-reader";
  const ticketScannerRef = useRef(null);
  const [ticketScannerModal, setTicketScannerModal] = useState({
    show: false,
    error: "",
    status: "IDLE"
  });

  const getPaymentQrImageSrc = (qrCode) => {
    /*
     * PayOS returns qrCode as the direct VietQR payment payload.
     * We render that payload directly as a QR image inside this modal.
     *
     * Do not use checkoutUrl here, otherwise scanning the QR opens PayOS page
     * instead of showing a direct bank-transfer VietQR payment.
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

  const getTicketQrImageSrc = (ticketCode) => {
    const qrValue = String(ticketCode || "").trim();

    if (!qrValue) {
      return "";
    }

    /*
     * QR ticket content is only the ticketId, for example TK-123456.
     * This makes it compatible with normal USB QR scanners:
     * focus the Ticket ID checkout field, scan, then press/search.
     */
    return `https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${encodeURIComponent(
      qrValue
    )}&dark=000000&bgcolor=ffffff`;
  };

  const normalizeTicketQrValue = (value) => {
    const rawValue = String(value || "").trim();

    if (!rawValue) {
      return "";
    }

    try {
      const parsed = JSON.parse(rawValue);
      const parsedTicketId = parsed.ticketId || parsed.ticket_id || parsed.ticket;

      if (parsedTicketId) {
        return formatTicket(parsedTicketId);
      }
    } catch (error) {
      // Raw ticket format is expected, so JSON parse failure is normal.
    }

    try {
      const url = new URL(rawValue);
      const ticketFromUrl =
        url.searchParams.get("ticketId") ||
        url.searchParams.get("ticket") ||
        url.searchParams.get("ticket_id");

      if (ticketFromUrl) {
        return formatTicket(ticketFromUrl);
      }
    } catch (error) {
      // Not a URL, continue with raw text.
    }

    const ticketMatch = rawValue.toUpperCase().match(/TK[-\s]?\d{1,6}/);

    if (ticketMatch) {
      return formatTicket(ticketMatch[0]);
    }

    return formatTicket(rawValue);
  };

  const searchCheckoutByTicket = async (ticketCode, options = {}) => {
    const normalizedTicket = normalizeTicketQrValue(ticketCode);
    const lostTicket = Boolean(options.lostTicket);
    const requireGatePlate = options.requireGatePlate !== false;

    if (!normalizedTicket) {
      alert("Không đọc được mã vé từ QR Ticket.");
      return;
    }

    if (requireGatePlate && !ensureCheckoutPlateWasScanned()) {
      return;
    }

    const scannedPlate = searchPlate.trim().toUpperCase();

    try {
      setSearchTicketId(normalizedTicket);
      setCheckoutLostTicket(lostTicket);

      const res = await parkingSessionApi.searchCheckout({
        ticketId: normalizedTicket,
        licensePlate: scannedPlate,
        lostTicket
      });

      const responseData = {
        ...res.data,
        lostTicket,
        checkOutTime: res.data?.checkOutTime || new Date().toISOString()
      };

      const gatePlate = getScannedCheckoutPlate();
      const ticketPlate = normalizePlateForCompare(responseData.licensePlate);

      if (requireGatePlate && gatePlate && ticketPlate && gatePlate !== ticketPlate) {
        setCheckoutData(null);
        setTicketScannerModal({
          show: false,
          error: "",
          status: "IDLE"
        });

        alert(
          `QR Ticket không khớp với biển số xe tại cổng.\n\nBiển số tại cổng: ${searchPlate}\nBiển số trong vé: ${responseData.licensePlate}`
        );
        return;
      }

      setCheckoutData(responseData);

      setTicketScannerModal({
        show: false,
        error: "",
        status: "IDLE"
      });
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "QR Ticket không hợp lệ hoặc xe không còn trong bãi."
      );
      setCheckoutData(null);
    }
  };

  const normalizeVehicleType = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (["car", "cars", "oto", "ô tô", "automobile"].includes(text)) return "car";
    if (["motorbike", "motorbikes", "bike", "motorcycle", "xe máy"].includes(text)) {
      return "motorbike";
    }
    return text;
  };

  const getVehicleTypeId = (type) => {
    if (normalizeVehicleType(type) === "car") return 1;
    if (normalizeVehicleType(type) === "motorbike") return 2;
    return null;
  };

  const cleanPlateInput = (value) => {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const formatCarPlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 8);
    const provinceCode = raw.slice(0, 2);
    const series = raw.slice(2, 3);
    const numbers = raw.slice(3, 8);

    let result = provinceCode;
    if (series) result += series;
    if (numbers.length > 0) result += `-${numbers.slice(0, 3)}`;
    if (numbers.length > 3) result += `.${numbers.slice(3, 5)}`;
    return result;
  };

  const formatMotorbikePlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 10);
    const provinceCode = raw.slice(0, 2);
    const rest = raw.slice(2);

    let series = "";
    let numberStartIndex = 0;

    if (/^[A-Z]{2}/.test(rest) || /^[A-Z]\d/.test(rest)) {
      series = rest.slice(0, 2);
      numberStartIndex = 2;
    } else if (/^[A-Z]/.test(rest)) {
      series = rest.slice(0, 1);
      numberStartIndex = 1;
    }

    const numbers = rest.slice(numberStartIndex, numberStartIndex + 5);

    let result = provinceCode;
    if (series) result += `-${series}`;
    if (numbers.length > 0) result += `-${numbers.slice(0, 3)}`;
    if (numbers.length > 3) result += `.${numbers.slice(3, 5)}`;
    return result;
  };

  const formatPlateByVehicleType = (value, type) => {
    if (normalizeVehicleType(type) === "car") {
      return formatCarPlate(value);
    }
    return formatMotorbikePlate(value);
  };

  const getPlatePlaceholder = (type) => {
    if (normalizeVehicleType(type) === "car") return "e.g., 30F-256.58";
    return "e.g., 27-B1-258.88 / 59-AA-123.56";
  };

  const getPlateHint = (type) => {
    if (normalizeVehicleType(type) === "car") return "Car format: 30F-256.58";
    return "Motorbike format: 27-B1-258.88 or 59-AA-123.56";
  };

  const validateVietnamPlate = (plate, type) => {
    const value = String(plate || "").trim().toUpperCase();
    const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
    const motorbikeRegex = /^\d{2}-[A-Z][A-Z0-9]{0,2}-\d{3}\.\d{2}$/;

    if (normalizeVehicleType(type) === "car") return carRegex.test(value);
    return motorbikeRegex.test(value);
  };

  const formatPlateForSearch = (value) => {
    const raw = String(value || "").toUpperCase();
    const cleaned = cleanPlateInput(raw);

    if (/^\d{2}-[A-Z0-9]{1,3}[-\s]/.test(raw) || raw.includes(" ")) {
      return formatMotorbikePlate(raw);
    }

    if (/^\d{2}[A-Z][0-9][0-9]{5}$/.test(cleaned) || /^\d{2}[A-Z]{2}[0-9]{5}$/.test(cleaned)) {
      return formatMotorbikePlate(cleaned);
    }

    return formatCarPlate(cleaned);
  };

  const normalizePlateForCompare = (value) => {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const getScannedCheckoutPlate = () => normalizePlateForCompare(searchPlate);

  const getSessionPlate = (session) => normalizePlateForCompare(session?.licensePlate);

  const ensureCheckoutPlateWasScanned = () => {
    if (checkOutOcrLoading) {
      alert("Hệ thống đang OCR biển số xe tại cổng ra. Vui lòng chờ OCR hoàn tất.");
      return false;
    }

    if (!checkoutPlateScanned || !getScannedCheckoutPlate()) {
      alert("Vui lòng scan/upload ảnh biển số xe tại cổng ra trước khi tìm vé hoặc checkout.");
      return false;
    }

    return true;
  };

  const ensureSelectedSessionMatchesScannedPlate = (session) => {
    if (!ensureCheckoutPlateWasScanned()) {
      return false;
    }

    const scannedPlate = getScannedCheckoutPlate();
    const selectedPlate = getSessionPlate(session);

    if (!selectedPlate || scannedPlate !== selectedPlate) {
      alert(
        `Xe được chọn không khớp với biển số đã scan.\n\nBiển số đã scan: ${searchPlate || "N/A"}\nBiển số xe được chọn: ${session?.licensePlate || "N/A"}`
      );
      return false;
    }

    return true;
  };

  const resetCheckoutGateScan = () => {
    setSearchPlate("");
    setCheckoutPlateScanned(false);
    setCheckOutPlateImage({
      previewUrl: "",
      fileName: "",
      message: ""
    });
    setCheckOutOcrLoading(false);
    setCheckOutOcrProgress(0);
    setCheckOutPlateInputKey((previousKey) => previousKey + 1);
  };

  const resetCheckoutWorkingState = () => {
    resetCheckoutGateScan();
    setSearchTicketId("");
    setCheckoutLostTicket(false);
  };

  const validateCheckoutBeforeFinalizing = () => {
    if (!checkoutData) {
      alert("Vui lòng search tìm một xe cụ thể trước khi thực hiện Check-out!");
      return false;
    }

    if (!ensureCheckoutPlateWasScanned()) {
      return false;
    }

    const scannedPlate = getScannedCheckoutPlate();
    const checkoutPlate = normalizePlateForCompare(checkoutData.licensePlate);

    if (checkoutPlate && scannedPlate !== checkoutPlate) {
      alert(
        `Biển số đã scan không khớp với thông tin checkout.\n\nBiển số đã scan: ${searchPlate}\nBiển số checkout: ${checkoutData.licensePlate}`
      );
      return false;
    }

    if (!checkoutFeeDetails.lostTicket && !checkoutData.ticketId) {
      alert("Vui lòng quét QR Ticket hoặc chọn vé dự phòng hợp lệ trước khi checkout.");
      return false;
    }

    return true;
  };

  const tryExtractPlateFromFileName = (fileName) => {
    const nameWithoutExt = String(fileName || "")
      .replace(/\.[^/.]+$/, "")
      .toUpperCase();

    const compactName = nameWithoutExt.replace(/[^A-Z0-9]/g, "");

    if (!compactName) {
      return "";
    }

    const carLike = compactName.match(/\d{2}[A-Z]\d{5}/);

    if (carLike) {
      return formatCarPlate(carLike[0]);
    }

    const motorbikeLike = compactName.match(/\d{2}[A-Z]{1,2}\d?\d{5}/);

    if (motorbikeLike) {
      return formatMotorbikePlate(motorbikeLike[0]);
    }

    return "";
  };

  const detectVehicleTypeFromPlate = (plate) => {
    const value = String(plate || "").trim().toUpperCase();

    const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
    const motorbikeRegex = /^\d{2}-[A-Z][A-Z0-9]{0,2}-\d{3}\.\d{2}$/;

    if (carRegex.test(value)) return "Car";
    if (motorbikeRegex.test(value)) return "Motorbike";

    return "";
  };

  const toUiVehicleType = (value) => {
    return normalizeVehicleType(value) === "motorbike" ? "Motorbike" : "Car";
  };

  const unwrapOcrData = (payload) => {
    return payload?.data || payload?.result || payload || {};
  };

  const pickOcrPlate = (data) => {
    return String(
      data.licensePlate ||
        data.license_plate ||
        data.plate ||
        data.plateNumber ||
        data.detectedPlate ||
        ""
    ).trim();
  };

  const pickOcrVehicleType = (data, detectedPlate, fallbackType = "") => {
    return (
      String(data.vehicleType || data.vehicle_type || "").trim() ||
      detectVehicleTypeFromPlate(detectedPlate) ||
      fallbackType
    );
  };

  const shouldAcceptOcrPlate = (plate, type, data) => {
    /*
     * FIX auto-fill: regex format biển số VN đã là bộ lọc mạnh nhất.
     * Nếu plate khớp đúng format đầy đủ (30F-256.58 / 27-B1-258.88)
     * thì luôn tự điền vào input và tự chọn loại xe.
     *
     * Trước đây chặn confidence < 0.72 và needsReview < 0.86 khiến
     * OCR đọc ĐÚNG biển nhưng frontend vẫn không tự điền gì cả.
     * Giờ chỉ từ chối khi độ tin cậy cực thấp (< 0.35), còn lại
     * tự điền + hiển thị cảnh báo "vui lòng kiểm tra" nếu confidence thấp.
     */
    if (!plate || !validateVietnamPlate(plate, type)) {
      return false;
    }

    const confidence = Number(data?.confidence || 0);

    if (confidence > 0 && confidence < 0.35) {
      return false;
    }

    return true;
  };

  const buildOcrRejectMessage = (data, detectedPlate, detectedType) => {
    const alternatives = Array.isArray(data?.alternatives)
      ? data.alternatives
          .map((item) => item.licensePlate || item.plate)
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const alternativeText = alternatives.length
      ? ` Gợi ý khác: ${alternatives.join(", ")}.`
      : "";

    if (detectedPlate && !validateVietnamPlate(detectedPlate, detectedType)) {
      return `OCR đọc chưa đủ hoặc sai format: ${detectedPlate}.${alternativeText} Vui lòng nhập/sửa thủ công.`;
    }

    return `${
      data?.message ||
      "OCR chưa đủ chắc chắn để tự điền biển số."
    }${alternativeText} Vui lòng kiểm tra và nhập/sửa thủ công.`;
  };

  const buildOcrSuccessMessage = (prefix, detectedPlate, uiDetectedType, data) => {
    const confidence = Number(data?.confidence || 0);
    const confidencePercent = Math.round(confidence * 100);
    const reviewHint =
      confidence > 0 && confidence < 0.75
        ? " | Độ tin cậy chưa cao, vui lòng kiểm tra lại biển số."
        : "";

    return `${prefix}: ${detectedPlate} | Loại xe: ${uiDetectedType} | Độ tin cậy: ${confidencePercent}%${reviewHint}`;
  };

  const formatDetectedPlateByCompactText = (compactText) => {
    const value = String(compactText || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (!value) {
      return null;
    }

    /*
     * Motorbike examples after OCR cleanup:
     * 99-E1 222.68  -> 99E122268
     * 59-AA 123.56  -> 59AA12356
     *
     * Check motorbike BEFORE car because a motorbike plate can contain
     * a car-looking substring at the beginning.
     */
    const motorbikeCandidates = value.match(/\d{2}[A-Z]{1,2}\d?\d{5}/g) || [];

    const bestMotorbike = motorbikeCandidates
      .sort((left, right) => right.length - left.length)
      .find((candidate) => candidate.length >= 9);

    if (bestMotorbike) {
      return {
        plate: formatMotorbikePlate(bestMotorbike),
        vehicleType: "Motorbike"
      };
    }

    /*
     * Car example after OCR cleanup:
     * 30F-256.58 -> 30F25658
     */
    const carCandidates = value.match(/\d{2}[A-Z]\d{5}/g) || [];
    const bestCar = carCandidates.find((candidate) => candidate.length === 8) || carCandidates[0];

    if (bestCar) {
      return {
        plate: formatCarPlate(bestCar),
        vehicleType: "Car"
      };
    }

    return null;
  };

  const extractPlateFromOcrText = (text) => {
    const rawText = String(text || "").toUpperCase();

    const variants = [
      rawText,
      rawText.replace(/[|]/g, "I"),
      rawText.replace(/[O]/g, "0"),
      rawText.replace(/[I]/g, "1"),
      rawText.replace(/[L]/g, "1")
    ];

    for (const variant of variants) {
      const detected = formatDetectedPlateByCompactText(variant);

      if (detected) {
        return detected;
      }
    }

    return null;
  };

  const runCheckInPlateOcr = async (file, previewUrl, fileName) => {
    setCheckInOcrLoading(true);
    setCheckInOcrProgress(0);

    setCheckInPlateImage({
      previewUrl,
      fileName,
      message: "Đang gửi ảnh sang OCR service..."
    });

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("vehicleType", vehicleType);

      setCheckInOcrProgress(25);

      const response = await axiosClient.post(
        `/plate-recognition/scan?vehicleType=${encodeURIComponent(vehicleType)}&mode=accurate`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setCheckInOcrProgress(100);

      const data = unwrapOcrData(response.data);
      const rawDetectedPlate = pickOcrPlate(data);
      const rawDetectedType = pickOcrVehicleType(data, rawDetectedPlate, vehicleType);
      const uiDetectedType = toUiVehicleType(rawDetectedType);
      const detectedPlate = formatPlateByVehicleType(rawDetectedPlate, uiDetectedType);

      const ocrSucceeded =
        data.success !== false &&
        Boolean(detectedPlate) &&
        shouldAcceptOcrPlate(detectedPlate, uiDetectedType, data);

      if (!ocrSucceeded) {
        setLicensePlateIn("");
        setCheckInPlateImage({
          previewUrl,
          fileName,
          message: buildOcrRejectMessage(data, detectedPlate, uiDetectedType)
        });
        return;
      }

      /*
       * FIX: khi OCR trả về biển hợp lệ thì LUÔN tự động:
       * 1. Chọn đúng loại xe (Car/Motorbike) trong dropdown.
       * 2. Điền biển số xuống input LICENSE PLATE NUMBER.
       */
      setVehicleType(uiDetectedType);
      setLicensePlateIn(detectedPlate);

      setCheckInPlateImage({
        previewUrl,
        fileName,
        message: buildOcrSuccessMessage("OCR nhận diện", detectedPlate, uiDetectedType, data)
      });
    } catch (error) {
      setLicensePlateIn("");
      setCheckInPlateImage({
        previewUrl,
        fileName,
        message:
          error.response?.data?.message ||
          "Không kết nối được OCR service. Hãy kiểm tra Python OCR service đang chạy ở port 8001 hoặc nhập biển số thủ công."
      });
    } finally {
      setCheckInOcrLoading(false);
      setCheckInOcrProgress(0);
    }
  };


  const runCheckOutPlateOcr = async (file, previewUrl, fileName) => {
    setCheckOutOcrLoading(true);
    setCheckOutOcrProgress(0);

    setCheckOutPlateImage({
      previewUrl,
      fileName,
      message: "Đang gửi ảnh checkout sang OCR service..."
    });

    setCheckoutData(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      setCheckOutOcrProgress(25);

      const response = await axiosClient.post(
        "/plate-recognition/scan?mode=accurate",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setCheckOutOcrProgress(100);

      const data = unwrapOcrData(response.data);
      const rawDetectedPlate = pickOcrPlate(data);
      const rawDetectedType = pickOcrVehicleType(data, rawDetectedPlate, "");
      const uiDetectedType = toUiVehicleType(rawDetectedType);
      const detectedPlate = formatPlateByVehicleType(rawDetectedPlate, uiDetectedType);

      const ocrSucceeded =
        data.success !== false &&
        Boolean(detectedPlate) &&
        shouldAcceptOcrPlate(detectedPlate, uiDetectedType, data);

      if (!ocrSucceeded) {
        setSearchPlate("");
        setCheckoutPlateScanned(false);
        setCheckOutPlateImage({
          previewUrl,
          fileName,
          message: buildOcrRejectMessage(data, detectedPlate, uiDetectedType)
        });
        return;
      }

      /*
       * FIX: OCR checkout thành công thì tự điền biển số cổng ra
       * và bật cờ checkoutPlateScanned để cho phép quét QR Ticket.
       */
      setSearchPlate(detectedPlate);
      setCheckoutPlateScanned(true);

      setCheckOutPlateImage({
        previewUrl,
        fileName,
        message: buildOcrSuccessMessage("OCR checkout nhận diện", detectedPlate, uiDetectedType, data)
      });
    } catch (error) {
      setSearchPlate("");
      setCheckoutPlateScanned(false);
      setCheckOutPlateImage({
        previewUrl,
        fileName,
        message:
          error.response?.data?.message ||
          "Không kết nối được OCR service cho checkout. Hãy kiểm tra Python OCR service ở port 8001."
      });
    } finally {
      setCheckOutOcrLoading(false);
      setCheckOutOcrProgress(0);
    }
  };

  const handlePlateImageUpload = async (event, mode) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const extractedPlate = tryExtractPlateFromFileName(file.name);

    const commonData = {
      previewUrl,
      fileName: file.name
    };

    if (mode === "checkin") {
      if (extractedPlate) {
        const detectedType = detectVehicleTypeFromPlate(extractedPlate) || vehicleType;

        setCheckInPlateImage({
          ...commonData,
          message: `Đã nhận diện từ tên file: ${extractedPlate} | Loại xe: ${detectedType}`
        });

        setLicensePlateIn(extractedPlate);
        setVehicleType(detectedType);
        return;
      }

      await runCheckInPlateOcr(file, previewUrl, file.name);
      return;
    }

    if (extractedPlate) {
      setSearchPlate(extractedPlate);
      setCheckoutPlateScanned(true);
      setCheckoutData(null);
      setCheckOutPlateImage({
        ...commonData,
        message: `Đã nhận diện biển số cổng ra từ tên file: ${extractedPlate}`
      });
      return;
    }

    await runCheckOutPlateOcr(file, previewUrl, file.name);
  };

  const formatTicket = (value) => {
    let clean = String(value || "").toUpperCase().replace(/^TK-/, "");
    let raw = clean.replace(/[^0-9]/g, "");
    if (raw.length > 6) raw = raw.slice(0, 6);
    return raw.length ? `TK-${raw}` : "";
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND"
    });
  };

  const calculateCheckoutFees = (data) => {
    if (!data) {
      return {
        baseFee: 0,
        overnightFee: 0,
        overstayFee: 0,
        holidayName: "",
        holidaySurcharge: 0,
        holidaySurchargeLabel: "",
        lostTicketFee: 0,
        lostTicket: false,
        totalAmount: 0,
        amountDue: 0,
        prepaidBooking: false,
        checkOutTime: new Date().toISOString()
      };
    }

    // Backend is now the single source of truth for pricing.
    // Pricing Policies calculate overtimeFee/overstayFee, and HolidayRepository calculates holidaySurcharge.
    const totalFromBackend = Number(data.totalAmount || 0);
    const overnightFee = Number(
      data.overtimeFee ||
        data.overnightFee ||
        data.extraOvernightFee ||
        0
    );
    const overstayFee = Number(data.overstayFee || 0);
    const holidaySurcharge = Number(data.holidaySurcharge || 0);
    const lostTicketFee = Number(data.lostTicketFee || 0);
    const lostTicket = data.lostTicket === true || lostTicketFee > 0;

    const baseFee = Number(
      data.parkingFee ||
        data.baseFee ||
        Math.max(totalFromBackend - overnightFee - overstayFee - holidaySurcharge - lostTicketFee, 0)
    );

    const prepaidBooking =
      data.prepaidBooking === true ||
      String(data.paymentStatus || "").toUpperCase() === "PAID_BY_BOOKING";

    /*
     * Important:
     * prepaidBooking only means the customer already paid the original booking fee.
     * If the customer checks out after booking.endTime, backend can still return
     * amountDue > 0 for overstay fee. Do not force this to 0 on the frontend.
     */
    const amountDue = Number(
      data.amountDue !== undefined && data.amountDue !== null
        ? data.amountDue
        : totalFromBackend
    );

    const holidayName = String(data.holidayName || "").trim();
    const holidaySurchargeLabel = holidayName ? holidayName : "Holiday";

    const checkOutDate = data.checkOutTime ? new Date(data.checkOutTime) : new Date();

    return {
      baseFee,
      overnightFee,
      overstayFee,
      holidayName,
      holidaySurcharge,
      holidaySurchargeLabel,
      lostTicketFee,
      lostTicket,
      totalAmount: totalFromBackend,
      amountDue,
      prepaidBooking,
      checkOutTime: Number.isNaN(checkOutDate.getTime())
        ? new Date().toISOString()
        : checkOutDate.toISOString()
    };
  };

  const checkoutFeeDetails = useMemo(() => {
    return calculateCheckoutFees(checkoutData);
  }, [checkoutData]);

  const filteredActiveSessions = useMemo(() => {
    const keyword = normalizePlateForCompare(activeVehicleSearch);

    if (!keyword) {
      return activeSessions;
    }

    return activeSessions.filter((session) => {
      const plate = normalizePlateForCompare(session.licensePlate);
      const ticket = String(session.ticketId || "").toUpperCase();
      const slot = String(session.slotCode || "").toUpperCase();

      return (
        plate.includes(keyword) ||
        ticket.includes(String(activeVehicleSearch || "").toUpperCase()) ||
        slot.includes(String(activeVehicleSearch || "").toUpperCase())
      );
    });
  }, [activeSessions, activeVehicleSearch]);

  const loadActiveSessions = async () => {
    try {
      const res = await parkingSessionApi.getActiveSessions();
      setActiveSessions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load active sessions failed:", error);
      setActiveSessions([]);
    }
  };

  const loadParkingFloorStats = async () => {
    try {
      const res = await parkingSessionApi.getParkingFloorStats();
      setFloorsData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load parking floor stats failed:", error);
      setFloorsData([]);
    }
  };

  useEffect(() => {
    loadActiveSessions();
    loadParkingFloorStats();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setEntryTime(now.toTimeString().split(" ")[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();

    if (checkInOcrLoading) {
      alert("Hệ thống đang OCR biển số. Vui lòng chờ OCR hoàn tất hoặc nhập biển số thủ công.");
      return;
    }

    const formattedPlate = licensePlateIn.trim().toUpperCase();
    if (!formattedPlate) return;

    if (!validateVietnamPlate(formattedPlate, vehicleType)) {
      alert(
        normalizeVehicleType(vehicleType) === "car"
          ? "Invalid car license plate format. Example: 30F-256.58"
          : "Invalid motorbike license plate format. Example: 27-B1-258.88 or 59-AA-123.56"
      );
      return;
    }

    const selectedVehicleTypeId = getVehicleTypeId(vehicleType);

    if (!selectedVehicleTypeId) {
      alert("Invalid vehicle type.");
      return;
    }

    try {
      /*
       * New check-in flow:
       * - Staff only enters license plate and vehicle type.
       * - Backend checks if this plate has a valid CONFIRMED booking.
       * - If yes, backend uses the reserved booking slot.
       * - If no, backend automatically finds the first AVAILABLE slot.
       */
      const payload = {
        licensePlate: formattedPlate,
        vehicleTypeId: selectedVehicleTypeId
      };

      const res = await parkingSessionApi.checkIn(payload);

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "checked in vehicle",
            target: res.data?.licensePlate || formattedPlate,
            detail: `slot ${res.data?.slotCode || "auto-assigned"}`
          }
        })
      );

      const createdTicketId = res.data?.ticketId || generateTicketId();

      setLicensePlateIn("");
      setCheckInPlateImage({
        previewUrl: "",
        fileName: "",
        message: ""
      });
      setCheckInOcrLoading(false);
      setCheckInOcrProgress(0);
      setCheckInPlateInputKey((previousKey) => previousKey + 1);
      setTicketId(createdTicketId);

      setTicketQrModal({
        show: true,
        data: {
          ticketId: createdTicketId,
          licensePlate: res.data?.licensePlate || formattedPlate,
          slotCode: res.data?.slotCode || "N/A",
          checkInTime: res.data?.checkInTime || new Date().toISOString(),
          qrImageSrc: getTicketQrImageSrc(createdTicketId)
        }
      });

      await loadActiveSessions();
      await loadParkingFloorStats();

      resetCheckoutWorkingState();
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data || "Check-in thất bại");
    }
  };

  const handleSearchCheckout = async (e) => {
    if (e) e.preventDefault();

    const ticket = searchTicketId.trim().toUpperCase();

    if (checkOutOcrLoading) {
      alert("Hệ thống đang OCR biển số xe tại cổng ra. Vui lòng chờ OCR hoàn tất.");
      return;
    }

    if (!ensureCheckoutPlateWasScanned()) {
      return;
    }

    if (!ticket) {
      alert("Vui lòng nhập Mã vé hoặc quét QR Ticket.");
      return;
    }

    await searchCheckoutByTicket(ticket, {
      lostTicket: false,
      requireGatePlate: true
    });
  };

  const normalizePaymentStatus = (value) => {
    return String(value || "").trim().toUpperCase();
  };

  const isPaymentSuccessStatus = (value) => {
    const status = normalizePaymentStatus(value);

    return ["PAID", "SUCCESS", "COMPLETED", "SUCCEEDED"].includes(status);
  };

  const finalizeCheckoutAfterPayment = async () => {
    if (!checkoutData || checkoutFinalized) {
      return;
    }

    try {
      setCheckoutFinalized(true);

      if (!validateCheckoutBeforeFinalizing()) {
        setCheckoutFinalized(false);
        setCheckoutPaymentStatus("ERROR");
        setCheckoutPaymentMessage("Không thể hoàn tất check-out vì thiếu scan biển số hợp lệ.");
        return;
      }

      const checkoutResponse = await parkingSessionApi.checkOut({
        ticketId: checkoutData.ticketId,
        licensePlate: searchPlate.trim().toUpperCase(),
        paymentMethod: "QR_CODE",
        lostTicket: checkoutFeeDetails.lostTicket
      });

      setCheckoutData({
        ...checkoutData,
        ...checkoutResponse.data,
        checkOutTime: checkoutResponse.data?.checkOutTime || new Date().toISOString()
      });

      setCheckoutPaymentStatus("PAID");
      setCheckoutPaymentMessage("Đã thanh toán thành công");

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "paid and checked out vehicle",
            target: checkoutData.licensePlate,
            detail: `ticket ${checkoutData.ticketId}`
          }
        })
      );

      await loadActiveSessions();
      await loadParkingFloorStats();

      resetCheckoutWorkingState();
    } catch (error) {
      setCheckoutFinalized(false);
      setCheckoutPaymentStatus("ERROR");
      setCheckoutPaymentMessage(
        error.response?.data?.message ||
          error.response?.data ||
          "Đã nhận thanh toán nhưng không thể hoàn tất check-out. Vui lòng thử lại."
      );
    }
  };

  const finalizeCheckoutWithCash = async () => {
    if (!checkoutData || checkoutFinalized) {
      return;
    }

    const confirmed = window.confirm(
      "Xác nhận nhân viên đã nhận đủ tiền mặt từ khách?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCheckoutFinalized(true);

      if (!validateCheckoutBeforeFinalizing()) {
        setCheckoutFinalized(false);
        return;
      }

      const checkoutResponse = await parkingSessionApi.checkOut({
        ticketId: checkoutData.ticketId,
        licensePlate: searchPlate.trim().toUpperCase(),
        paymentMethod: "CASH",
        lostTicket: checkoutFeeDetails.lostTicket
      });

      setCheckoutData({
        ...checkoutData,
        ...checkoutResponse.data,
        checkOutTime: checkoutResponse.data?.checkOutTime || new Date().toISOString()
      });

      setCheckoutPaymentData(null);
      setCheckoutPaymentStatus("PAID");
      setCheckoutPaymentMessage("Đã thanh toán thành công bằng tiền mặt");

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "cash paid and checked out vehicle",
            target: checkoutData.licensePlate,
            detail: `ticket ${checkoutData.ticketId}`
          }
        })
      );

      await loadActiveSessions();
      await loadParkingFloorStats();

      resetCheckoutWorkingState();
    } catch (error) {
      setCheckoutFinalized(false);
      setCheckoutPaymentStatus("ERROR");
      setCheckoutPaymentMessage(
        error.response?.data?.message ||
          error.response?.data ||
          "Không thể hoàn tất check-out bằng tiền mặt. Vui lòng thử lại."
      );
    }
  };

  const handleConfirmCheckOut = async () => {
    if (!validateCheckoutBeforeFinalizing()) {
      return;
    }

    try {
      /*
       * If amountDue is 0, checkout can be completed immediately.
       *
       * For prepaid booking:
       * - amountDue = 0 means the customer leaves on time.
       * - amountDue > 0 means the customer overstayed, so we must create QR
       *   and collect only the extra overstay fee.
       */
      if (Number(checkoutFeeDetails.amountDue || 0) <= 0) {
        const checkoutResponse = await parkingSessionApi.checkOut({
          ticketId: checkoutData.ticketId,
          licensePlate: searchPlate.trim().toUpperCase(),
          paymentMethod: "PREPAID_BOOKING",
          lostTicket: checkoutFeeDetails.lostTicket
        });

        setCheckoutData({
          ...checkoutData,
          ...checkoutResponse.data,
          checkOutTime: checkoutResponse.data?.checkOutTime || new Date().toISOString()
        });

        setCheckoutPaymentData(null);
        setCheckoutPaymentStatus("PAID");
        setCheckoutPaymentMessage("Đã thanh toán thành công");
        setCheckoutFinalized(true);
        setShowPaymentModal(true);

        window.dispatchEvent(
          new CustomEvent("dispatchParkingNotification", {
            detail: {
              action: "checked out prepaid booking",
              target: checkoutData.licensePlate,
              detail: `ticket ${checkoutData.ticketId}`
            }
          })
        );

        await loadActiveSessions();
        await loadParkingFloorStats();

      resetCheckoutWorkingState();
        return;
      }

      const checkoutPaymentResponse = await parkingSessionApi.createCheckoutPayOSPayment({
        ticketId: checkoutData.ticketId,
        licensePlate: searchPlate.trim().toUpperCase(),
        amount: checkoutFeeDetails.amountDue,
        lostTicket: checkoutFeeDetails.lostTicket,
        description: checkoutFeeDetails.lostTicket
          ? `LOSTTICKET${String(checkoutData.ticketId || "").replace(/[^A-Z0-9]/gi, "")}`
          : checkoutFeeDetails.prepaidBooking
            ? `OVERSTAY${String(checkoutData.ticketId || "").replace(/[^A-Z0-9]/gi, "")}`
            : `CHECKOUT${String(checkoutData.ticketId || "").replace(/[^A-Z0-9]/gi, "")}`
      });

      const paymentData = checkoutPaymentResponse.data || {};

      setCheckoutPaymentData({
        ...paymentData,
        qrImageSrc: getPaymentQrImageSrc(paymentData.qrCode)
      });

      /*
       * Do not call checkOut immediately here.
       * The system waits until PayOS reports PAID, then finalizeCheckoutAfterPayment()
       * releases the slot and records the checkout payment.
       */
      setCheckoutPaymentStatus("PENDING");
      setCheckoutPaymentMessage("Đang chờ khách quét QR và chuyển khoản...");
      setCheckoutFinalized(false);
      setShowPaymentModal(true);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Tạo QR thanh toán hoặc Check-out thất bại"
      );
    }
  };

  useEffect(() => {
    if (
      !showPaymentModal ||
      !checkoutPaymentData?.orderCode ||
      checkoutPaymentStatus === "PAID" ||
      checkoutPaymentStatus === "ERROR"
    ) {
      return undefined;
    }

    let stopped = false;

    const checkPaymentStatus = async () => {
      try {
        const response = await axiosClient.get(
          `/payments/payos/checkout-status/${checkoutPaymentData.orderCode}`
        );

        const status = normalizePaymentStatus(
          response.data?.paymentStatus ||
            response.data?.status ||
            response.data?.code
        );

        if (stopped) {
          return;
        }

        if (isPaymentSuccessStatus(status)) {
          setCheckoutPaymentStatus("PAID");
          setCheckoutPaymentMessage("Đã thanh toán thành công");
          await finalizeCheckoutAfterPayment();
          return;
        }

        if (["CANCELLED", "CANCELED", "EXPIRED", "FAILED"].includes(status)) {
          setCheckoutPaymentStatus(status);
          setCheckoutPaymentMessage("Thanh toán chưa thành công hoặc đã bị hủy.");
          return;
        }

        setCheckoutPaymentStatus("PENDING");
        setCheckoutPaymentMessage("Đang chờ khách quét QR và chuyển khoản...");
      } catch (error) {
        if (!stopped) {
          setCheckoutPaymentStatus("PENDING");
          setCheckoutPaymentMessage("Đang chờ xác nhận thanh toán từ PayOS...");
        }
      }
    };

    checkPaymentStatus();

    const intervalId = window.setInterval(checkPaymentStatus, 3000);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [
    showPaymentModal,
    checkoutPaymentData?.orderCode,
    checkoutPaymentStatus,
    checkoutFinalized,
    checkoutData
  ]);

  useEffect(() => {
    if (!ticketScannerModal.show) {
      return undefined;
    }

    let stopped = false;
    let html5QrCode = null;

    const stopScanner = async () => {
      stopped = true;

      try {
        if (html5QrCode && html5QrCode.isScanning) {
          await html5QrCode.stop();
        }
      } catch (error) {
        // Ignore stop errors when the scanner has already been stopped.
      }

      try {
        if (html5QrCode) {
          await html5QrCode.clear();
        }
      } catch (error) {
        // Ignore clear errors when the scanner node is already removed.
      }
    };

    const startScanner = async () => {
      try {
        setTicketScannerModal((prev) => ({
          ...prev,
          status: "STARTING",
          error: ""
        }));

        html5QrCode = new Html5Qrcode(ticketScannerElementId);
        ticketScannerRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          setTicketScannerModal((prev) => ({
            ...prev,
            status: "ERROR",
            error:
              "Không tìm thấy camera. Vui lòng kiểm tra camera hoặc nhập mã vé thủ công."
          }));
          return;
        }

        const backCamera =
          cameras.find((camera) =>
            String(camera.label || "").toLowerCase().includes("back")
          ) || cameras[0];

        await html5QrCode.start(
          { deviceId: { exact: backCamera.id } },
          {
            fps: 10,
            qrbox: {
              width: 240,
              height: 240
            },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            if (stopped || !decodedText) {
              return;
            }

            await stopScanner();
            await searchCheckoutByTicket(decodedText);
          },
          () => {
            // Ignore scan failures frame-by-frame while waiting for a QR.
          }
        );

        setTicketScannerModal((prev) => ({
          ...prev,
          status: "SCANNING",
          error: ""
        }));
      } catch (error) {
        setTicketScannerModal((prev) => ({
          ...prev,
          status: "ERROR",
          error:
            "Không thể mở camera để quét QR. Hãy cấp quyền camera cho trình duyệt hoặc nhập mã vé thủ công."
        }));
      }
    };

    window.setTimeout(startScanner, 100);

    return () => {
      stopScanner();
    };
  }, [ticketScannerModal.show]);

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSearchPlate("");
    setSearchTicketId("");
    setCheckoutData(null);
    setCheckoutPaymentData(null);
    setCheckoutPaymentStatus("IDLE");
    setCheckoutPaymentMessage("");
    setCheckoutFinalized(false);
    resetCheckoutWorkingState();
  };

  useEffect(() => {
    if (!ticketQrModal.show && !ticketScannerModal.show) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setTicketQrModal({ show: false, data: null });
        setTicketScannerModal({
          show: false,
          error: "",
          status: "IDLE"
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ticketQrModal.show, ticketScannerModal.show]);

  const hasExtraPaymentDue = Number(checkoutFeeDetails.amountDue || 0) > 0;
  const isPrepaidWithoutExtraFee =
    checkoutFeeDetails.prepaidBooking && !hasExtraPaymentDue;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{
          padding: "1.5rem 2rem",
          boxSizing: "border-box",
          background: theme.page,
          color: theme.text
        }}
      >
        <Header />

        <style>{`
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
          #ticket-qr-reader {
            color: #e5e7eb;
          }

          #ticket-qr-reader video {
            width: 100% !important;
            min-height: 320px !important;
            object-fit: cover !important;
          }

          #ticket-qr-reader__dashboard_section_csr button,
          #ticket-qr-reader__dashboard button {
            border: none !important;
            border-radius: 0.45rem !important;
            padding: 0.55rem 0.8rem !important;
            background: #3b82f6 !important;
            color: #ffffff !important;
            font-weight: 800 !important;
            cursor: pointer !important;
          }

          #ticket-qr-reader__dashboard_section_csr span,
          #ticket-qr-reader__dashboard_section_swaplink {
            color: #93c5fd !important;
          }

          @keyframes plateScanLine {
            from {
              transform: translateY(0);
            }
            to {
              transform: translateY(230px);
            }
          }
        `}</style>

        <div className="dashboard-title" style={{ padding: "1.5rem 0 0.5rem 0" }}>
          <h1 style={{ color: theme.text, fontSize: "1.75rem", margin: "0 0 0.25rem 0" }}>
            Check-in/out Portal
          </h1>
          <p style={{ color: theme.muted, margin: 0, fontSize: "0.9rem" }}>
            Manage vehicle flow and real-time gate operations.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
            marginTop: "1.5rem"
          }}
        >
          <div
            style={{
              background: theme.card,
              padding: "2rem",
              borderRadius: "0.85rem",
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}
          >
            <h3
              style={{
                color: theme.text,
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0
              }}
            >
              <SquarePlay size={18} style={{ color: theme.blue }} />
              Check-in Entry
            </h3>

            <form onSubmit={handleCheckInSubmit}>
              <PlateImageScannerBox
                inputKey={`checkin-plate-${checkInPlateInputKey}`}
                previewUrl={checkInPlateImage.previewUrl}
                isLoading={checkInOcrLoading}
                onChange={(event) => handlePlateImageUpload(event, "checkin")}
              />

              {checkInPlateImage.message && (
                <div
                  style={{
                    marginTop: "-0.9rem",
                    marginBottom: "1rem",
                    padding: "0.65rem 0.8rem",
                    borderRadius: "0.55rem",
                    border: `1px solid ${theme.border}`,
                    background: theme.cardSoft,
                    color: theme.muted,
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    lineHeight: 1.45
                  }}
                >
                  {checkInPlateImage.message}
                </div>
              )}

              <div style={{ marginBottom: "1.2rem" }}>
                <FieldLabel>LICENSE PLATE NUMBER</FieldLabel>
                <TextInput
                  type="text"
                  value={licensePlateIn}
                  placeholder={getPlatePlaceholder(vehicleType)}
                  maxLength={normalizeVehicleType(vehicleType) === "car" ? 10 : 13}
                  required
                  onChange={(e) => {
                    const formattedPlate = formatPlateByVehicleType(e.target.value, vehicleType);
                    const detectedType = detectVehicleTypeFromPlate(formattedPlate);

                    setLicensePlateIn(formattedPlate);

                    if (detectedType && detectedType !== vehicleType) {
                      setVehicleType(detectedType);
                    }
                  }}
                />
                <p style={{ margin: "0.35rem 0 0", color: theme.muted, fontSize: "0.72rem" }}>
                  {getPlateHint(vehicleType)}
                </p>
              </div>

              <div style={{ marginBottom: "1.2rem" }}>
                <FieldLabel>VEHICLE TYPE</FieldLabel>
                <SelectInput
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setLicensePlateIn("");
                  }}
                >
                  <option value="Car">Car</option>
                  <option value="Motorbike">Motorbike</option>
                </SelectInput>

                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem 0.85rem",
                    borderRadius: "0.55rem",
                    border: `1px solid ${theme.border}`,
                    background: theme.cardSoft,
                    color: theme.muted,
                    fontSize: "0.78rem",
                    lineHeight: 1.45
                  }}
                >
                  Upload ảnh biển số để giả lập camera cổng vào. OCR sẽ tự điền biển số và tự chọn loại xe. Nhân viên vẫn có thể nhập tay để phòng trường hợp scan sai. Nếu có booking hợp lệ, hệ thống dùng slot đã đặt; nếu không, tự gán slot còn trống.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "2rem"
                }}
              >
                <div>
                  <FieldLabel>ENTRY TIME</FieldLabel>
                  <TextInput type="text" value={entryTime} readOnly muted />
                </div>
                <div>
                  <FieldLabel>TICKET ID</FieldLabel>
                  <TextInput type="text" value={ticketId} readOnly muted />
                </div>
              </div>

              <button
                type="submit"
                disabled={checkInOcrLoading}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: checkInOcrLoading ? theme.cardSoft : theme.blue,
                  color: checkInOcrLoading ? theme.muted : "#ffffff",
                  border: "none",
                  borderRadius: "0.6rem",
                  fontWeight: "700",
                  cursor: checkInOcrLoading ? "wait" : "pointer"
                }}
              >
                Confirm Check-in
              </button>
            </form>
          </div>

          <div
            style={{
              background: theme.card,
              padding: "2rem",
              borderRadius: "0.85rem",
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}
          >
            <h3
              style={{
                color: theme.text,
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0
              }}
            >
              <LogOut size={18} style={{ color: theme.green }} />
              Check-out Exit
            </h3>

            <PlateImageScannerBox
              inputKey={`checkout-plate-${checkOutPlateInputKey}`}
              previewUrl={checkOutPlateImage.previewUrl}
              isLoading={checkOutOcrLoading}
              onChange={(event) => handlePlateImageUpload(event, "checkout")}
            />

            {checkOutPlateImage.message && (
              <div
                style={{
                  marginTop: "-0.9rem",
                  marginBottom: "1rem",
                  padding: "0.65rem 0.8rem",
                  borderRadius: "0.55rem",
                  border: `1px solid ${theme.border}`,
                  background: theme.cardSoft,
                  color: theme.muted,
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  lineHeight: 1.45
                }}
              >
                {checkOutPlateImage.message}
              </div>
            )}

            <div
              style={{
                marginTop: checkOutPlateImage.message ? "0" : "-0.9rem",
                marginBottom: "1rem",
                padding: "0.75rem 0.85rem",
                borderRadius: "0.55rem",
                border: `1px solid ${checkoutPlateScanned ? "rgba(16, 185, 129, 0.4)" : theme.border}`,
                background: checkoutPlateScanned ? "rgba(16, 185, 129, 0.08)" : theme.cardSoft,
                color: checkoutPlateScanned ? theme.green : theme.muted,
                fontSize: "0.78rem",
                fontWeight: 750,
                lineHeight: 1.45
              }}
            >
              {checkoutPlateScanned
                ? `Đã scan biển số cổng ra: ${searchPlate}. Bây giờ có thể quét QR Ticket hoặc chọn đúng xe trong danh sách.`
                : "Bắt buộc scan/upload biển số xe ở cổng ra trước khi quét QR Ticket, chọn xe mất vé hoặc xác nhận checkout."}
            </div>

            <form
              onSubmit={handleSearchCheckout}
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}
            >
              <TextInput
                type="text"
                value={searchTicketId}
                placeholder="Mã vé (TK-926006)"
                onChange={(e) => setSearchTicketId(formatTicket(e.target.value))}
                style={{ flex: "1 1 280px", minWidth: "240px" }}
              />

              <button
                type="submit"
                disabled={checkOutOcrLoading}
                style={{
                  padding: "0 1.5rem",
                  minHeight: "50px",
                  background: checkOutOcrLoading ? theme.cardSoft : theme.green,
                  color: checkOutOcrLoading ? theme.muted : "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "700",
                  cursor: checkOutOcrLoading ? "wait" : "pointer"
                }}
              >
                SEARCH
              </button>

              <button
                type="button"
                disabled={checkOutOcrLoading}
                onClick={() => {
                  if (!ensureCheckoutPlateWasScanned()) {
                    return;
                  }

                  setTicketScannerModal({
                    show: true,
                    error: "",
                    status: "IDLE"
                  });
                }}
                style={{
                  padding: "0 1rem",
                  minHeight: "50px",
                  background: checkOutOcrLoading ? theme.cardSoft : theme.blue,
                  color: checkOutOcrLoading ? theme.muted : "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "800",
                  cursor: checkOutOcrLoading ? "wait" : "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Scan QR Ticket
              </button>
            </form>

            {checkoutData ? (
              <div
                style={{
                  background: theme.cardSoft,
                  padding: "1.25rem",
                  borderRadius: "0.7rem",
                  marginBottom: "1.5rem",
                  border: `1px solid ${theme.border}`
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    gap: "1rem"
                  }}
                >
                  <div>
                    <h4 style={{ color: theme.text, margin: 0, fontSize: "1.2rem", letterSpacing: "1px" }}>
                      {checkoutData.licensePlate}
                    </h4>
                    <span style={{ color: theme.muted, fontSize: "0.75rem" }}>
                      Slot: {checkoutData.slotCode || "N/A"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <span style={{ background: theme.greenSoft, color: theme.green, padding: "0.2rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.7rem", fontWeight: "700", height: "fit-content" }}>
                      STAY ACTIVE
                    </span>
                    {checkoutFeeDetails.lostTicket && (
                      <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "0.2rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.7rem", fontWeight: "800", height: "fit-content" }}>
                        LOST TICKET
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    fontSize: "0.8rem",
                    color: theme.muted,
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: "1rem",
                    marginBottom: "1rem"
                  }}
                >
                  <InfoItem label="ENTRY TIME">{formatDateTime(checkoutData.checkInTime)}</InfoItem>
                  <InfoItem label="CURRENT TIME">{formatDateTime(checkoutFeeDetails.checkOutTime)}</InfoItem>
                  <InfoItem label="DURATION">{checkoutData.durationHours ? `${checkoutData.durationHours} giờ` : "N/A"}</InfoItem>
                  <InfoItem label="PRICE PER HOUR">{checkoutData.pricePerHour ? `${formatCurrency(checkoutData.pricePerHour)} / giờ` : "N/A"}</InfoItem>
                </div>

                <div style={{ fontSize: "0.85rem", color: theme.muted, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <PriceRow
                    label={checkoutFeeDetails.prepaidBooking ? "Booked Parking Fee" : "Parking Fee"}
                    value={
                      checkoutFeeDetails.prepaidBooking
                        ? "Paid in advance"
                        : formatCurrency(checkoutFeeDetails.baseFee)
                    }
                  />

                  {checkoutFeeDetails.overnightFee > 0 && (
                    <PriceRow
                      label="Overnight Fee"
                      value={formatCurrency(checkoutFeeDetails.overnightFee)}
                    />
                  )}

                  {checkoutFeeDetails.overstayFee > 0 && (
                    <PriceRow
                      label="Overstay Fee"
                      value={formatCurrency(checkoutFeeDetails.overstayFee)}
                    />
                  )}

                  {checkoutFeeDetails.holidaySurcharge > 0 && (
                    <PriceRow
                      label={`Holiday Surcharge - ${checkoutFeeDetails.holidaySurchargeLabel}`}
                      value={formatCurrency(checkoutFeeDetails.holidaySurcharge)}
                    />
                  )}

                  {checkoutFeeDetails.lostTicketFee > 0 && (
                    <PriceRow
                      label="Lost Ticket Fee"
                      value={formatCurrency(checkoutFeeDetails.lostTicketFee)}
                    />
                  )}

                  <PriceRow label="Service Charge" value={formatCurrency(0)} />

                  {checkoutFeeDetails.prepaidBooking && (
                    <PriceRow
                      label="Booking Payment"
                      value="Paid in advance"
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "800", color: theme.text, borderTop: `1px dashed ${theme.border}`, paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <span>{checkoutFeeDetails.prepaidBooking ? "Amount Due" : "Total Amount"}</span>
                    <span style={{ color: theme.green }}>
                      {formatCurrency(checkoutFeeDetails.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: theme.cardSoft, padding: "2rem", borderRadius: "0.7rem", marginBottom: "1.5rem", border: `1px dashed ${theme.border}`, textAlign: "center", color: theme.muted, fontSize: "0.9rem", lineHeight: 1.45 }}>
                No checkout information yet. First scan/upload the exit plate, then scan QR Ticket or choose the matching vehicle from the active list.
              </div>
            )}

            <button
              onClick={handleConfirmCheckOut}
              disabled={!checkoutData || !checkoutPlateScanned}
              style={{
                width: "100%",
                padding: "1rem",
                background: checkoutData && checkoutPlateScanned ? theme.green : theme.cardSoft,
                color: checkoutData && checkoutPlateScanned ? "#ffffff" : theme.muted,
                border: "none",
                borderRadius: "0.6rem",
                fontWeight: "700",
                cursor: checkoutData && checkoutPlateScanned ? "pointer" : "not-allowed"
              }}
            >
              Confirm Check-out
            </button>
          </div>
        </div>

        <div style={{ background: theme.card, padding: "1.5rem", borderRadius: "0.85rem", border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
          <h3 style={{ color: theme.text, fontSize: "1rem", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ReceiptText size={18} style={{ color: theme.blue }} />
            Danh Sách Xe Đang Đỗ Trong Hệ Thống ({activeSessions.length} xe)
          </h3>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap"
            }}
          >
            <TextInput
              type="text"
              value={activeVehicleSearch}
              placeholder="Tìm biển số xe đang đỗ..."
              onChange={(event) => setActiveVehicleSearch(event.target.value)}
              style={{ maxWidth: "320px" }}
            />

            <span style={{ color: theme.muted, fontSize: "0.78rem" }}>
              Bắt buộc scan biển số xe tại cổng ra trước. Sau đó mới được chọn đúng xe trong danh sách để xử lý QR lỗi hoặc mất vé +10.000đ.
            </span>
          </div>

          {activeSessions.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
              Bãi xe trống trơn, hãy thực hiện check-in thêm xe mới.
            </p>
          ) : filteredActiveSessions.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
              Không tìm thấy xe đang đỗ phù hợp với từ khóa.
            </p>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {filteredActiveSessions.map((session) => (
                <div
                  key={session.ticketId}
                  onClick={async () => {
                    if (!ensureSelectedSessionMatchesScannedPlate(session)) {
                      return;
                    }

                    setCheckoutLostTicket(false);
                    setSearchTicketId(session.ticketId);

                    try {
                      const res = await parkingSessionApi.searchCheckout({
                        ticketId: session.ticketId,
                        licensePlate: searchPlate.trim().toUpperCase(),
                        lostTicket: false
                      });

                      setCheckoutData({
                        ...res.data,
                        lostTicket: false,
                        checkOutTime: res.data?.checkOutTime || new Date().toISOString()
                      });

                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } catch (error) {
                      alert(error.response?.data?.message || "Không lấy được thông tin checkout");
                      setCheckoutData(null);
                    }
                  }}
                  style={{
                    background: theme.cardSoft,
                    border: `1px solid ${theme.border}`,
                    padding: "0.75rem 0.85rem",
                    borderRadius: "0.6rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    minWidth: "190px"
                  }}
                  title="Phải scan biển số ở cổng ra trước, sau đó mới được chọn xe này"
                >
                  <span style={{ color: theme.text, fontWeight: "800", fontSize: "0.9rem" }}>
                    {session.licensePlate}
                  </span>
                  <span style={{ color: theme.blue, fontSize: "0.72rem" }}>
                    Slot: {session.slotCode || "N/A"} | {session.ticketId}
                  </span>

                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setTicketQrModal({
                          show: true,
                          data: {
                            ticketId: session.ticketId,
                            licensePlate: session.licensePlate,
                            slotCode: session.slotCode || "N/A",
                            checkInTime: session.checkInTime || new Date().toISOString(),
                            qrImageSrc: getTicketQrImageSrc(session.ticketId)
                          }
                        });
                      }}
                      style={{
                        border: "none",
                        borderRadius: "0.35rem",
                        padding: "0.35rem 0.5rem",
                        background: theme.blueSoft,
                        color: theme.blue,
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      QR Ticket
                    </button>

                    <button
                      type="button"
                      onClick={async (event) => {
                        event.stopPropagation();

                        if (!ensureSelectedSessionMatchesScannedPlate(session)) {
                          return;
                        }

                        setCheckoutLostTicket(true);
                        setSearchTicketId(session.ticketId);

                        try {
                          const res = await parkingSessionApi.searchCheckout({
                            ticketId: session.ticketId,
                            licensePlate: searchPlate.trim().toUpperCase(),
                            lostTicket: true
                          });

                          setCheckoutData({
                            ...res.data,
                            lostTicket: true,
                            checkOutTime: res.data?.checkOutTime || new Date().toISOString()
                          });

                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } catch (error) {
                          alert(error.response?.data?.message || "Không lấy được thông tin checkout mất vé");
                          setCheckoutData(null);
                        }
                      }}
                      style={{
                        border: "none",
                        borderRadius: "0.35rem",
                        padding: "0.35rem 0.5rem",
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "#f59e0b",
                        fontSize: "0.68rem",
                        fontWeight: 900,
                        cursor: "pointer"
                      }}
                    >
                      Mất vé +10K
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {ticketQrModal.show && ticketQrModal.data && (
          <div
            onClick={() => setTicketQrModal({ show: false, data: null })}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(10, 15, 30, 0.82)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9998,
              backdropFilter: "blur(4px)",
              padding: "1rem",
              overflowY: "auto"
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "relative",
                width: "360px",
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "calc(100vh - 2rem)",
                overflowY: "auto",
                boxSizing: "border-box",
                borderRadius: "0.9rem"
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                  pointerEvents: "none"
                }}
              >
                <button
                  onClick={() => setTicketQrModal({ show: false, data: null })}
                  style={{
                    width: "34px",
                    height: "34px",
                    margin: "0.4rem 0.4rem -2.3rem 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    color: "#ffffff",
                    pointerEvents: "auto",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.35)"
                  }}
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  background: "#fffdf4",
                  color: "#111827",
                  borderRadius: "0.85rem",
                  border: "1px solid #111827",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                  padding: "1rem",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                }}
              >
                <div style={{ textAlign: "center", paddingRight: "1.5rem", paddingLeft: "1.5rem" }}>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      lineHeight: 1.1,
                      fontWeight: 950,
                      letterSpacing: "0.08em"
                    }}
                  >
                    PARKING TICKET
                  </div>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", fontWeight: 800 }}>
                    ParkSystem Pro
                  </div>
                </div>

                <DashedLine />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "0.25rem 0"
                  }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      padding: "0.5rem",
                      border: "2px solid #111827",
                      borderRadius: "0.35rem"
                    }}
                  >
                    <img
                      src={ticketQrModal.data.qrImageSrc}
                      alt="Parking ticket QR code"
                      width={210}
                      height={210}
                      style={{ display: "block" }}
                    />
                  </div>
                </div>

                <DashedLine />

                <div
                  style={{
                    textAlign: "center",
                    fontSize: "1.35rem",
                    fontWeight: 950,
                    letterSpacing: "0.08em",
                    padding: "0.15rem 0"
                  }}
                >
                  {ticketQrModal.data.ticketId}
                </div>

                <DashedLine />

                <TicketInfoRow label="Biển số / License Plate" value={ticketQrModal.data.licensePlate} />
                <TicketInfoRow label="Vị trí / Slot" value={ticketQrModal.data.slotCode} />
                <TicketInfoRow label="Giờ vào / Check-in" value={formatDateTime(ticketQrModal.data.checkInTime)} />
                <TicketInfoRow label="Loại vé / Type" value="PARKING SESSION" />

                <DashedLine />

                <div
                  style={{
                    border: "2px solid #111827",
                    borderRadius: "0.35rem",
                    padding: "0.45rem",
                    textAlign: "center",
                    fontSize: "1rem",
                    fontWeight: 950,
                    letterSpacing: "0.14em"
                  }}
                >
                  VALID
                </div>

                <div
                  style={{
                    marginTop: "0.75rem",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    fontSize: "0.72rem",
                    lineHeight: 1.4,
                    textAlign: "center",
                    fontWeight: 750
                  }}
                >
                  Khách vui lòng chụp màn hình vé này. Khi check-out, đưa mã QR cho nhân viên quét để tìm xe.
                </div>

                <button
                  type="button"
                  onClick={() => setTicketQrModal({ show: false, data: null })}
                  style={{
                    width: "100%",
                    marginTop: "0.75rem",
                    padding: "0.65rem",
                    borderRadius: "0.45rem",
                    border: "2px solid #111827",
                    background: "#111827",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif"
                  }}
                >
                  Đóng vé
                </button>
              </div>

              <div
                style={{
                  marginTop: "0.65rem",
                  color: "#d1d5db",
                  textAlign: "center",
                  fontSize: "0.76rem",
                  lineHeight: 1.4
                }}
              >
                Click ra ngoài hoặc nhấn ESC để đóng. QR này chỉ dùng để tìm vé khi check-out.
              </div>
            </div>
          </div>
        )}

        {ticketScannerModal.show && (
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(10, 15, 30, 0.82)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9998,
              backdropFilter: "blur(4px)",
              padding: "1rem"
            }}
          >
            <div
              className="pm-modal-card"
              style={{
                padding: "1.5rem",
                borderRadius: "1rem",
                width: "520px",
                maxWidth: "100%",
                position: "relative",
                boxSizing: "border-box"
              }}
            >
              <button
                onClick={() =>
                  setTicketScannerModal({
                    show: false,
                    error: "",
                    status: "IDLE"
                  })
                }
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af"
                }}
              >
                <X size={20} />
              </button>

              <h3
                className="pm-text-title"
                style={{
                  marginTop: 0,
                  marginBottom: "0.4rem",
                  fontSize: "1.1rem",
                  fontWeight: 850
                }}
              >
                Scan QR Ticket
              </h3>

              <p
                className="pm-text-subrow"
                style={{
                  marginTop: 0,
                  marginBottom: "1rem",
                  fontSize: "0.84rem",
                  lineHeight: 1.45
                }}
              >
                Bắt buộc scan biển số xe ở cổng ra trước. Sau đó đưa ảnh QR Ticket của khách trước camera để hệ thống đối chiếu đúng xe.
              </p>

              <div
                style={{
                  background: "#020617",
                  borderRadius: "0.85rem",
                  overflow: "hidden",
                  border: "1px solid rgba(96, 165, 250, 0.35)",
                  minHeight: "320px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative"
                }}
              >
                {ticketScannerModal.error ? (
                  <div
                    style={{
                      color: "#fca5a5",
                      padding: "1.25rem",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      lineHeight: 1.45
                    }}
                  >
                    {ticketScannerModal.error}
                  </div>
                ) : (
                  <div
                    id={ticketScannerElementId}
                    style={{
                      width: "100%",
                      minHeight: "320px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  />
                )}
              </div>

              <div
                className="pm-text-subrow"
                style={{
                  marginTop: "1rem",
                  fontSize: "0.78rem",
                  lineHeight: 1.45,
                  textAlign: "center"
                }}
              >
                Nếu QR Ticket bị lỗi, nhân viên chỉ được chọn xe trong danh sách sau khi biển số đã scan khớp với xe đó.
              </div>
            </div>
          </div>
        )}

        {showPaymentModal && checkoutData && (
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
              <button
                onClick={handleCloseModal}
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

              <h3 className="pm-text-title" style={{ marginTop: 0, fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem" }}>
                {isPrepaidWithoutExtraFee ? "Check-out Receipt" : "Check-out Payment"}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="pm-text-license" style={{ fontSize: "1.8rem", fontWeight: "800", letterSpacing: "0.5px" }}>
                      {checkoutData.licensePlate}
                    </span>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.25rem 0.6rem", borderRadius: "0.375rem", fontSize: "0.72rem", fontWeight: "700" }}>
                      STAY ACTIVE
                    </span>
                  </div>

                  <div className="pm-text-subrow" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Slot: {checkoutData.slotCode || "N/A"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 1rem", marginTop: "1.5rem" }}>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>ENTRY TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {formatDateTime(checkoutData.checkInTime)}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>CURRENT TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {formatDateTime(checkoutFeeDetails.checkOutTime)}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>DURATION</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {checkoutData.durationHours || 1} giờ
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>PRICE PER HOUR</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {formatCurrency(checkoutData.pricePerHour || 5000)} / giờ
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <ModalPriceRow
                      label={checkoutFeeDetails.prepaidBooking ? "Booked Parking Fee" : "Parking Fee"}
                      value={
                        checkoutFeeDetails.prepaidBooking
                          ? "Paid in advance"
                          : formatCurrency(checkoutFeeDetails.baseFee)
                      }
                    />

                    {checkoutFeeDetails.overnightFee > 0 && (
                      <ModalPriceRow
                        label="Overnight Fee"
                        value={formatCurrency(checkoutFeeDetails.overnightFee)}
                      />
                    )}

                    {checkoutFeeDetails.overstayFee > 0 && (
                      <ModalPriceRow
                        label="Overstay Fee"
                        value={formatCurrency(checkoutFeeDetails.overstayFee)}
                      />
                    )}

                    {checkoutFeeDetails.holidaySurcharge > 0 && (
                      <ModalPriceRow
                        label={`Holiday Surcharge - ${checkoutFeeDetails.holidaySurchargeLabel}`}
                        value={formatCurrency(checkoutFeeDetails.holidaySurcharge)}
                      />
                    )}

                    {checkoutFeeDetails.lostTicketFee > 0 && (
                      <ModalPriceRow
                        label="Lost Ticket Fee"
                        value={formatCurrency(checkoutFeeDetails.lostTicketFee)}
                      />
                    )}

                    <ModalPriceRow label="Service Charge" value={formatCurrency(0)} />

                    {checkoutFeeDetails.prepaidBooking && (
                      <ModalPriceRow label="Booking Payment" value="Paid in advance" />
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", borderTop: "1px dashed rgba(128,128,128,0.3)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                      <span className="pm-text-title">
                        {checkoutFeeDetails.prepaidBooking ? "Amount Due" : "Total Amount"}
                      </span>
                      <span style={{ color: "#10b981", fontSize: "1.25rem", fontWeight: "800" }}>
                        {formatCurrency(checkoutFeeDetails.amountDue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="pm-text-title" style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", textAlign: "center" }}>
                    {isPrepaidWithoutExtraFee
                      ? "Booking already paid"
                      : checkoutFeeDetails.prepaidBooking
                        ? "Thanh toán phí quá giờ"
                        : "Thanh toán bằng QR hoặc tiền mặt"}
                  </div>

                  {isPrepaidWithoutExtraFee ? (
                    <div
                      className="pm-qr-box"
                      style={{
                        padding: "1.5rem",
                        borderRadius: "0.75rem",
                        textAlign: "center",
                        maxWidth: "260px"
                      }}
                    >
                      <CheckCircle2 size={54} color="#10b981" style={{ marginBottom: "0.75rem" }} />
                      <div className="pm-text-title" style={{ fontSize: "1rem", fontWeight: 800 }}>
                        No additional payment required
                      </div>
                      <div className="pm-text-subrow" style={{ fontSize: "0.78rem", marginTop: "0.65rem", lineHeight: 1.45 }}>
                        This customer paid during booking and did not exceed the booked end time. Checkout only releases the parking slot and records the exit time.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pm-qr-box" style={{ padding: "1.25rem", borderRadius: "0.75rem", display: "inline-block" }}>
                        <div style={{ background: "#ffffff", padding: "0.5rem", borderRadius: "0.4rem", display: "block" }}>
                          {checkoutPaymentData?.qrImageSrc ? (
                            <img
                              src={checkoutPaymentData.qrImageSrc}
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
                        {checkoutFeeDetails.prepaidBooking
                          ? "Vui lòng quét mã QR PayOS để thanh toán phí quá giờ."
                          : "Khách có thể quét QR PayOS hoặc trả tiền mặt cho nhân viên."}
                      </div>

                      {checkoutPaymentData?.orderCode && (
                        <div className="pm-text-subrow" style={{ fontSize: "0.72rem", textAlign: "center", marginTop: "0.6rem", maxWidth: "240px", lineHeight: "1.4" }}>
                          Order code: {checkoutPaymentData.orderCode}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "1rem",
                          width: "100%",
                          borderRadius: "0.75rem",
                          padding: "0.85rem 1rem",
                          background:
                            checkoutPaymentStatus === "PAID"
                              ? "rgba(16, 185, 129, 0.14)"
                              : "rgba(59, 130, 246, 0.12)",
                          border:
                            checkoutPaymentStatus === "PAID"
                              ? "1px solid rgba(16, 185, 129, 0.35)"
                              : "1px solid rgba(96, 165, 250, 0.3)",
                          color: checkoutPaymentStatus === "PAID" ? "#10b981" : "#60a5fa",
                          fontSize: "0.86rem",
                          fontWeight: 800,
                          textAlign: "center",
                          lineHeight: 1.35
                        }}
                      >
                        {checkoutPaymentStatus === "PAID" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                            <CheckCircle2 size={18} />
                            {checkoutPaymentMessage || "Đã thanh toán thành công"}
                          </span>
                        ) : (
                          checkoutPaymentMessage || "Đang chờ thanh toán..."
                        )}
                      </div>

                      {checkoutPaymentStatus !== "PAID" && (
                        <div
                          style={{
                            marginTop: "1rem",
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.55rem"
                          }}
                        >
                          <div
                            className="pm-text-subrow"
                            style={{
                              fontSize: "0.76rem",
                              textAlign: "center",
                              lineHeight: 1.4
                            }}
                          >
                            Nếu khách trả tiền mặt, nhân viên nhận đủ tiền rồi bấm nút bên dưới để hoàn tất check-out.
                          </div>

                          <button
                            type="button"
                            onClick={finalizeCheckoutWithCash}
                            disabled={checkoutFinalized}
                            style={{
                              width: "100%",
                              border: "none",
                              borderRadius: "0.6rem",
                              padding: "0.8rem 0.9rem",
                              background: checkoutFinalized ? "#64748b" : "#f59e0b",
                              color: "#ffffff",
                              fontSize: "0.86rem",
                              fontWeight: 900,
                              cursor: checkoutFinalized ? "not-allowed" : "pointer"
                            }}
                          >
                            Đã nhận tiền mặt
                          </button>
                        </div>
                      )}

                      {checkoutPaymentData?.checkoutUrl && checkoutPaymentStatus !== "PAID" && (
                        <button
                          type="button"
                          onClick={() => {
                            window.open(checkoutPaymentData.checkoutUrl, "_blank");
                          }}
                          style={{
                            marginTop: "1rem",
                            width: "100%",
                            border: "none",
                            borderRadius: "0.6rem",
                            padding: "0.75rem 0.9rem",
                            background: "#10b981",
                            color: "#ffffff",
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            cursor: "pointer"
                          }}
                        >
                          Mở PayOS dự phòng
                        </button>
                      )}
                    </>
                  )}

                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1rem", width: "100%", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <Zap size={13} fill="#60a5fa" /> Xác nhận tức thì
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <ShieldCheck size={13} fill="transparent" /> Thanh toán bảo mật
                    </div>
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

function PlateImageScannerBox({
  inputKey,
  previewUrl,
  isLoading = false,
  onChange
}) {
  return (
    <label
      style={{
        display: "block",
        width: "100%",
        marginBottom: "1.4rem",
        cursor: isLoading ? "wait" : "pointer"
      }}
      title="Click để chọn ảnh biển số"
    >
      <input
        key={inputKey}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={isLoading}
        style={{ display: "none" }}
      />

      <div
        style={{
          position: "relative",
          minHeight: "360px",
          borderRadius: "1rem",
          background: "#ffffff",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
          transition: "0.2s ease"
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Uploaded license plate"
            style={{
              width: "100%",
              height: "360px",
              objectFit: "contain",
              background: "#ffffff",
              display: "block",
              opacity: isLoading ? 0.72 : 1
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "360px",
              background: "#ffffff"
            }}
          />
        )}

        {isLoading && (
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: "15%",
              height: "3px",
              borderRadius: "999px",
              background: "linear-gradient(90deg, transparent, #2563eb, transparent)",
              boxShadow: "0 0 18px rgba(37, 99, 235, 0.95)",
              zIndex: 2,
              animation: "plateScanLine 1.35s ease-in-out infinite alternate"
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none"
          }}
        >
          <ScanCorner position="top-left" />
          <ScanCorner position="top-right" />
          <ScanCorner position="bottom-left" />
          <ScanCorner position="bottom-right" />
        </div>
      </div>
    </label>
  );
}

function ScanCorner({ position }) {
  const baseStyle = {
    position: "absolute",
    width: "42px",
    height: "42px"
  };

  if (position === "top-left") {
    return (
      <div
        style={{
          ...baseStyle,
          top: "18px",
          left: "18px",
          borderTop: "4px solid #111827",
          borderLeft: "4px solid #111827",
          borderTopLeftRadius: "2px"
        }}
      />
    );
  }

  if (position === "top-right") {
    return (
      <div
        style={{
          ...baseStyle,
          top: "18px",
          right: "18px",
          borderTop: "4px solid #111827",
          borderRight: "4px solid #111827",
          borderTopRightRadius: "2px"
        }}
      />
    );
  }

  if (position === "bottom-left") {
    return (
      <div
        style={{
          ...baseStyle,
          bottom: "18px",
          left: "18px",
          borderBottom: "4px solid #111827",
          borderLeft: "4px solid #111827",
          borderBottomLeftRadius: "2px"
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        bottom: "18px",
        right: "18px",
        borderBottom: "4px solid #111827",
        borderRight: "4px solid #111827",
        borderBottomRightRadius: "2px"
      }}
    />
  );
}

function DashedLine() {
  return (
    <div
      style={{
        borderTop: "2px dashed #111827",
        margin: "0.6rem 0"
      }}
    />
  );
}

function TicketInfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: "0.5rem",
        alignItems: "center",
        borderBottom: "1px dashed rgba(17, 24, 39, 0.65)",
        padding: "0.42rem 0",
        color: "#111827"
      }}
    >
      <div style={{ fontSize: "0.66rem", fontWeight: 900 }}>{label}</div>
      <div
        style={{
          fontSize: "0.82rem",
          fontWeight: 950,
          textAlign: "right",
          overflowWrap: "anywhere"
        }}
      >
        {value || "N/A"}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: "700", display: "block", marginBottom: "0.5rem" }}>
      {children}
    </label>
  );
}

function TextInput({ muted = false, style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "0.75rem",
        background: muted ? theme.cardSoft : theme.input,
        border: `1px solid ${theme.border}`,
        borderRadius: "0.5rem",
        color: muted ? theme.muted : theme.text,
        outline: "none",
        letterSpacing: props.readOnly ? "0" : "1px",
        fontWeight: "650",
        fontSize: "0.9rem",
        boxSizing: "border-box",
        ...style
      }}
    />
  );
}

function SelectInput({ children, style = {}, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "0.75rem",
        background: theme.input,
        border: `1px solid ${theme.border}`,
        borderRadius: "0.5rem",
        color: theme.text,
        cursor: props.disabled ? "not-allowed" : "pointer",
        outline: "none",
        fontWeight: "650",
        boxSizing: "border-box",
        ...style
      }}
    >
      {children}
    </select>
  );
}

function InfoItem({ label, children }) {
  return (
    <div>
      {label}
      <div style={{ color: theme.text, marginTop: "0.2rem", fontWeight: "650" }}>{children}</div>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ color: theme.text, fontWeight: "650" }}>{value}</span>
    </div>
  );
}

function ModalPriceRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
      <span className="pm-text-subrow">{label}</span>
      <span className="pm-text-title" style={{ fontWeight: "600" }}>{value}</span>
    </div>
  );
}

export default CheckInOutPage;
