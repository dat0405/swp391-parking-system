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
  const [checkoutPlateScanned, setCheckoutPlateScanned] = useState(false);
  const [activeVehicleSearch, setActiveVehicleSearch] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutPaymentData, setCheckoutPaymentData] = useState(null);
  const [checkoutPaymentStatus, setCheckoutPaymentStatus] = useState("IDLE");
  const [checkoutPaymentMessage, setCheckoutPaymentMessage] = useState("");
  const [checkoutFinalized, setCheckoutFinalized] = useState(false);

  const ticketScannerElementId = "ticket-qr-reader";
  const checkInPreviewUrlRef = useRef("");
  const checkOutPreviewUrlRef = useRef("");
  const [ticketScannerModal, setTicketScannerModal] = useState({
    show: false,
    error: "",
    status: "IDLE"
  });

  const getApiErrorMessage = (error, fallbackMessage) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.message === "string" && responseData.message.trim()) {
      return responseData.message;
    }

    if (typeof responseData?.error === "string" && responseData.error.trim()) {
      return responseData.error;
    }

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }

    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }

    return fallbackMessage;
  };

  const revokePreviewUrl = (previewUrlRef) => {
    const currentUrl = previewUrlRef.current;

    if (currentUrl && currentUrl.startsWith("blob:")) {
      URL.revokeObjectURL(currentUrl);
    }

    previewUrlRef.current = "";
  };

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
      alert("Unable to read the ticket code from the QR ticket.");
      return;
    }

    if (requireGatePlate && !ensureCheckoutPlateWasScanned()) {
      return;
    }

    const scannedPlate = searchPlate.trim().toUpperCase();

    try {
      setSearchTicketId(normalizedTicket);

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
          `The QR ticket does not match the vehicle plate at the exit gate.\n\nExit gate plate: ${searchPlate}\nTicket plate: ${responseData.licensePlate}`
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
        getApiErrorMessage(
          error,
          "The QR ticket is invalid or the vehicle is no longer in the parking area."
        )
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

  const normalizePlateForCompare = (value) => {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const getScannedCheckoutPlate = () => normalizePlateForCompare(searchPlate);

  const getSessionPlate = (session) => normalizePlateForCompare(session?.licensePlate);

  const ensureCheckoutPlateWasScanned = () => {
    if (checkOutOcrLoading) {
      alert("The system is recognizing the exit gate license plate. Please wait for OCR to finish.");
      return false;
    }

    if (!checkoutPlateScanned || !getScannedCheckoutPlate()) {
      alert("Please scan or upload the exit gate license plate before searching for a ticket or checking out.");
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
        `The selected vehicle does not match the scanned license plate.\n\nScanned plate: ${searchPlate || "N/A"}\nSelected vehicle plate: ${session?.licensePlate || "N/A"}`
      );
      return false;
    }

    return true;
  };

  const resetCheckoutGateScan = () => {
    revokePreviewUrl(checkOutPreviewUrlRef);
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
  };

  const validateCheckoutBeforeFinalizing = () => {
    if (!checkoutData) {
      alert("Please search for a specific vehicle before checking out.");
      return false;
    }

    if (!ensureCheckoutPlateWasScanned()) {
      return false;
    }

    const scannedPlate = getScannedCheckoutPlate();
    const checkoutPlate = normalizePlateForCompare(checkoutData.licensePlate);

    if (checkoutPlate && scannedPlate !== checkoutPlate) {
      alert(
        `The scanned license plate does not match the checkout information.\n\nScanned plate: ${searchPlate}\nCheckout plate: ${checkoutData.licensePlate}`
      );
      return false;
    }

    if (!checkoutFeeDetails.lostTicket && !checkoutData.ticketId) {
      alert("Please scan the QR ticket or select a valid backup ticket before checkout.");
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
    const compactValue = cleanPlateInput(value);

    const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
    const motorbikeRegex = /^\d{2}-[A-Z][A-Z0-9]{0,2}-\d{3}\.\d{2}$/;

    /*
     * A motorbike plate normally contains a two-character series
     * after the province code, for example:
     *
     * 63-B9-999.99 -> 63B999999
     * 59-AA-123.56 -> 59AA12356
     *
     * Check the motorbike structure before the car structure so OCR
     * does not incorrectly classify a two-line motorbike plate as a car.
     */
    const compactMotorbikeRegex =
      /^\d{2}(?:[A-Z]\d|[A-Z]{2})\d{5}$/;

    const compactCarRegex =
      /^\d{2}[A-Z]\d{5}$/;

    if (
      motorbikeRegex.test(value) ||
      compactMotorbikeRegex.test(compactValue)
    ) {
      return "Motorbike";
    }

    if (
      carRegex.test(value) ||
      compactCarRegex.test(compactValue)
    ) {
      return "Car";
    }

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

  const shouldAcceptOcrPlate = (plate, type) => {
    /*
     * A complete valid Vietnamese plate format is enough for auto-fill.
     * OCR confidence is not shown and does not block the result.
     */
    return Boolean(
      plate &&
        validateVietnamPlate(
          plate,
          type
        )
    );
  };

  const buildOcrRejectMessage = (data, detectedPlate, detectedType) => {
    const alternatives = Array.isArray(data?.alternatives)
      ? data.alternatives
          .map((item) => item.licensePlate || item.plate)
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const alternativeText = alternatives.length
      ? ` Other suggestions: ${alternatives.join(", ")}.`
      : "";

    if (detectedPlate && !validateVietnamPlate(detectedPlate, detectedType)) {
      return `OCR could not fully read the plate or the format is invalid: ${detectedPlate}.${alternativeText} Please enter or correct it manually.`;
    }

    return `${
      data?.message ||
      "OCR could not identify a complete valid license plate."
    }${alternativeText} Please verify and correct it manually.`;
  };

  const buildOcrSuccessMessage = (
    prefix,
    detectedPlate,
    uiDetectedType
  ) => {
    return `${prefix}: ${detectedPlate} | Vehicle type: ${uiDetectedType}`;
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

  const resolvePlateFromOcrTextCandidates = (data) => {
    const alternatives = Array.isArray(data?.alternatives)
      ? data.alternatives
      : [];

    const textCandidates = [
      data?.rawText,
      data?.raw_text,
      data?.recognizedText,
      data?.recognized_text,
      data?.ocrText,
      data?.ocr_text,
      data?.text,
      ...alternatives.flatMap((item) => [
        item?.licensePlate,
        item?.license_plate,
        item?.plate,
        item?.text,
        item?.rawText,
        item?.raw_text
      ])
    ].filter(Boolean);

    let carResult = null;

    for (const candidate of textCandidates) {
      const detected =
        extractPlateFromOcrText(candidate);

      if (!detected) {
        continue;
      }

      /*
       * A two-line motorbike plate is more specific than the common
       * one-line car pattern, so return it immediately.
       */
      if (
        detected.vehicleType ===
        "Motorbike"
      ) {
        return detected;
      }

      if (!carResult) {
        carResult = detected;
      }
    }

    return carResult;
  };

  const resolveOcrPlate = (
    data,
    fallbackType = ""
  ) => {
    const rawDetectedPlate =
      pickOcrPlate(data);

    const rawDetectedType =
      pickOcrVehicleType(
        data,
        rawDetectedPlate,
        fallbackType
      );

    const textFallback =
      resolvePlateFromOcrTextCandidates(
        data
      );

    /*
     * Important for two-line motorbike plates:
     *
     * The OCR API may return an incomplete car-looking value such as
     * 63B-999.99, while raw OCR text still contains 63-B9 / 999.99.
     * Prefer the complete motorbike result from raw text.
     */
    if (
      textFallback?.vehicleType ===
      "Motorbike"
    ) {
      return textFallback;
    }

    if (
      !rawDetectedPlate &&
      textFallback
    ) {
      return textFallback;
    }

    const structurallyDetectedType =
      detectVehicleTypeFromPlate(
        rawDetectedPlate
      );

    const candidateTypes = [
      structurallyDetectedType,
      textFallback?.vehicleType,
      rawDetectedType,
      fallbackType,
      "Motorbike",
      "Car"
    ]
      .filter(Boolean)
      .map(toUiVehicleType)
      .filter(
        (type, index, values) =>
          values.indexOf(type) === index
      );

    for (
      const candidateType of
      candidateTypes
    ) {
      const formattedPlate =
        formatPlateByVehicleType(
          rawDetectedPlate,
          candidateType
        );

      if (
        validateVietnamPlate(
          formattedPlate,
          candidateType
        )
      ) {
        return {
          plate: formattedPlate,
          vehicleType: candidateType
        };
      }
    }

    return (
      textFallback || {
        plate: rawDetectedPlate,
        vehicleType: toUiVehicleType(
          rawDetectedType ||
            fallbackType
        )
      }
    );
  };


  const createPlateRecognitionFormData = (file) => {
    const formData = new FormData();

    /*
     * Backend PlateRecognitionController expects:
     * @RequestParam("image") MultipartFile image
     */
    formData.append(
      "image",
      file,
      file?.name || "plate-image.jpg"
    );

    return formData;
  };

  const postPlateRecognitionImage = async (
    file
  ) => {
    const queryParams =
      new URLSearchParams();

    queryParams.set(
      "mode",
      "accurate"
    );

    const formData =
      createPlateRecognitionFormData(file);

    /*
     * Do not manually set Content-Type here.
     *
     * axiosClient's request interceptor removes the default JSON
     * Content-Type for FormData. The browser then creates:
     * multipart/form-data; boundary=...
     */
    return axiosClient.post(
      `/plate-recognition/scan?${queryParams.toString()}`,
      formData,
      {
        withCredentials: true,
        headers: {
          Accept: "application/json"
        }
      }
    );
  };

  const runCheckInPlateOcr = async (file, previewUrl, fileName) => {
    setCheckInOcrLoading(true);
    setCheckInOcrProgress(0);

    setCheckInPlateImage({
      previewUrl,
      fileName,
      message: "Sending the image to the OCR service..."
    });

    try {
      setCheckInOcrProgress(25);

      const response =
        await postPlateRecognitionImage(
          file
        );

      setCheckInOcrProgress(100);

      const data = unwrapOcrData(response.data);
      const resolvedPlate =
        resolveOcrPlate(data);

      const detectedPlate =
        resolvedPlate?.plate || "";

      const uiDetectedType =
        resolvedPlate?.vehicleType ||
        detectVehicleTypeFromPlate(
          detectedPlate
        ) ||
        "Car";

      const ocrSucceeded =
        data.success !== false &&
        Boolean(detectedPlate) &&
        shouldAcceptOcrPlate(detectedPlate, uiDetectedType);

      if (!ocrSucceeded) {
        setLicensePlateIn("");
        setCheckInPlateImage({
          previewUrl,
          fileName,
          message: buildOcrRejectMessage(data, detectedPlate, uiDetectedType)
        });
        return;
      }

      setVehicleType(uiDetectedType);
      setLicensePlateIn(detectedPlate);

      setCheckInPlateImage({
        previewUrl,
        fileName,
        message: buildOcrSuccessMessage(
          "OCR detected",
          detectedPlate,
          uiDetectedType
        )
      });
    } catch (error) {
      setLicensePlateIn("");
      setCheckInPlateImage({
        previewUrl,
        fileName,
        message: getApiErrorMessage(
          error,
          "Unable to connect to the OCR service. Check that the Python OCR service is running on port 8001, or enter the license plate manually."
        )
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
      message: "Sending the checkout image to the OCR service..."
    });

    setCheckoutData(null);

    try {
      setCheckOutOcrProgress(25);

      const response =
        await postPlateRecognitionImage(file);

      setCheckOutOcrProgress(100);

      const data = unwrapOcrData(response.data);
      const resolvedPlate = resolveOcrPlate(data);
      const detectedPlate = resolvedPlate?.plate || "";
      const uiDetectedType = resolvedPlate?.vehicleType || "Car";

      const ocrSucceeded =
        data.success !== false &&
        Boolean(detectedPlate) &&
        shouldAcceptOcrPlate(detectedPlate, uiDetectedType);

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

      setSearchPlate(detectedPlate);
      setCheckoutPlateScanned(true);

      setCheckOutPlateImage({
        previewUrl,
        fileName,
        message: buildOcrSuccessMessage(
          "Checkout OCR detected",
          detectedPlate,
          uiDetectedType
        )
      });
    } catch (error) {
      setSearchPlate("");
      setCheckoutPlateScanned(false);
      setCheckOutPlateImage({
        previewUrl,
        fileName,
        message: getApiErrorMessage(
          error,
          "Unable to connect to the checkout OCR service. Check that the Python OCR service is running on port 8001."
        )
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

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid license plate image file.");
      event.target.value = "";
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      alert("The license plate image must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    const previewRef =
      mode === "checkin" ? checkInPreviewUrlRef : checkOutPreviewUrlRef;

    revokePreviewUrl(previewRef);

    const previewUrl = URL.createObjectURL(file);
    previewRef.current = previewUrl;

    const allowFilenameFallback =
      import.meta.env.DEV &&
      import.meta.env.VITE_ALLOW_FILENAME_PLATE_FALLBACK === "true";

    const extractedPlate = allowFilenameFallback
      ? tryExtractPlateFromFileName(file.name)
      : "";

    const commonData = {
      previewUrl,
      fileName: file.name
    };

    if (mode === "checkin") {
      if (extractedPlate) {
        const detectedType =
          detectVehicleTypeFromPlate(extractedPlate) || vehicleType;

        setCheckInPlateImage({
          ...commonData,
          message: `DEV fallback from file name: ${extractedPlate} | Vehicle type: ${detectedType}`
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
        message: `DEV exit gate plate fallback from file name: ${extractedPlate}`
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
    return date.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("en-US", {
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

  useEffect(() => {
    loadActiveSessions();
  }, []);

  useEffect(() => {
    return () => {
      revokePreviewUrl(checkInPreviewUrlRef);
      revokePreviewUrl(checkOutPreviewUrlRef);
    };
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
      alert("The system is recognizing the license plate. Please wait for OCR to finish or enter the plate manually.");
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

      revokePreviewUrl(checkInPreviewUrlRef);
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

      resetCheckoutWorkingState();
    } catch (error) {
      alert(getApiErrorMessage(error, "Check-in failed."));
    }
  };

  const handleSearchCheckout = async (e) => {
    if (e) e.preventDefault();

    const ticket = searchTicketId.trim().toUpperCase();

    if (checkOutOcrLoading) {
      alert("The system is recognizing the exit gate license plate. Please wait for OCR to finish.");
      return;
    }

    if (!ensureCheckoutPlateWasScanned()) {
      return;
    }

    if (!ticket) {
      alert("Please enter the ticket ID or scan the QR ticket.");
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
        setCheckoutPaymentMessage("Checkout cannot be completed because a valid license plate scan is missing.");
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
      setCheckoutPaymentMessage("Payment completed successfully.");

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

      resetCheckoutWorkingState();
    } catch (error) {
      setCheckoutFinalized(false);
      setCheckoutPaymentStatus("ERROR");
      setCheckoutPaymentMessage(
        getApiErrorMessage(
          error,
          "Payment was received, but checkout could not be completed. Please try again."
        )
      );
    }
  };

  const finalizeCheckoutWithCash = async () => {
    if (!checkoutData || checkoutFinalized) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm that the staff member has received the full cash payment from the customer?"
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
      setCheckoutPaymentMessage("Cash payment completed successfully.");

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

      resetCheckoutWorkingState();
    } catch (error) {
      setCheckoutFinalized(false);
      setCheckoutPaymentStatus("ERROR");
      setCheckoutPaymentMessage(
        getApiErrorMessage(
          error,
          "Unable to complete checkout with cash. Please try again."
        )
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
        setCheckoutPaymentMessage("Payment completed successfully.");
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
      setCheckoutPaymentMessage("Waiting for the customer to scan the QR code and complete the transfer...");
      setCheckoutFinalized(false);
      setShowPaymentModal(true);
    } catch (error) {
      alert(
        getApiErrorMessage(
          error,
          "Failed to create the payment QR code or complete checkout."
        )
      );
    }
  };

  useEffect(() => {
    const terminalPaymentStatuses = [
      "PAID",
      "ERROR",
      "CANCELLED",
      "CANCELED",
      "EXPIRED",
      "FAILED"
    ];

    if (
      !showPaymentModal ||
      !checkoutPaymentData?.orderCode ||
      terminalPaymentStatuses.includes(checkoutPaymentStatus)
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
          setCheckoutPaymentMessage("Payment completed successfully.");
          await finalizeCheckoutAfterPayment();
          return;
        }

        if (["CANCELLED", "CANCELED", "EXPIRED", "FAILED"].includes(status)) {
          setCheckoutPaymentStatus(status);
          setCheckoutPaymentMessage("Payment was unsuccessful or was cancelled.");
          return;
        }

        setCheckoutPaymentStatus("PENDING");
        setCheckoutPaymentMessage("Waiting for the customer to scan the QR code and complete the transfer...");
      } catch (error) {
        if (!stopped) {
          setCheckoutPaymentStatus("PENDING");
          setCheckoutPaymentMessage("Waiting for payment confirmation from PayOS...");
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
        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          setTicketScannerModal((prev) => ({
            ...prev,
            status: "ERROR",
            error:
              "No camera was found. Check the camera connection or enter the ticket ID manually."
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
            "Unable to open the camera for QR scanning. Allow camera access in the browser or enter the ticket ID manually."
        }));
      }
    };

    const startTimerId = window.setTimeout(() => {
      if (!stopped) {
        startScanner();
      }
    }, 100);

    return () => {
      window.clearTimeout(startTimerId);
      stopScanner();
    };
  }, [ticketScannerModal.show]);

  const handleCloseModal = () => {
    if (checkoutPaymentStatus === "PENDING" && !checkoutFinalized) {
      const confirmed = window.confirm(
        "PayOS payment is still awaiting confirmation. Closing this window will stop tracking the transaction. Do you still want to close it?"
      );

      if (!confirmed) {
        return;
      }
    }

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
                progress={checkInOcrProgress}
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
                  Upload a license plate image to simulate the entry gate camera. OCR will fill in the plate and select the vehicle type automatically. Staff can still enter the plate manually if the scan is incorrect. If a valid booking exists, the reserved slot is used; otherwise, the system assigns an available slot automatically.
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
              progress={checkOutOcrProgress}
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
                ? `Exit gate plate scanned: ${searchPlate}. You can now scan the QR ticket or select the matching vehicle from the list.`
                : "You must scan or upload the exit gate license plate before scanning the QR ticket, selecting a lost-ticket vehicle, or confirming checkout."}
            </div>

            <form
              onSubmit={handleSearchCheckout}
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}
            >
              <TextInput
                type="text"
                value={searchTicketId}
                placeholder="Ticket ID (TK-926006)"
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
                  <InfoItem label="DURATION">{checkoutData.durationHours ? `${checkoutData.durationHours} hours` : "N/A"}</InfoItem>
                  <InfoItem label="PRICE PER HOUR">{checkoutData.pricePerHour ? `${formatCurrency(checkoutData.pricePerHour)} / hour` : "N/A"}</InfoItem>
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
            Vehicles Currently Parked ({activeSessions.length} vehicles)
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
              placeholder="Search parked vehicle plates..."
              onChange={(event) => setActiveVehicleSearch(event.target.value)}
              style={{ maxWidth: "320px" }}
            />

            <span style={{ color: theme.muted, fontSize: "0.78rem" }}>
              Scan the vehicle plate at the exit gate first. Then select the matching vehicle from the list to handle an invalid QR ticket or a lost ticket fee of 10,000 VND.
            </span>
          </div>

          {activeSessions.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
              The parking area is empty. Check in a new vehicle.
            </p>
          ) : filteredActiveSessions.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
              No parked vehicle matches the search term.
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
                      alert(getApiErrorMessage(error, "Unable to retrieve checkout information."));
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
                  title="Scan the exit gate license plate before selecting this vehicle."
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
                          alert(getApiErrorMessage(error, "Unable to retrieve lost-ticket checkout information."));
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
                      Lost Ticket +10K
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
                  title="Close"
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

                <TicketInfoRow label="License Plate" value={ticketQrModal.data.licensePlate} />
                <TicketInfoRow label="Parking Slot" value={ticketQrModal.data.slotCode} />
                <TicketInfoRow label="Check-in Time" value={formatDateTime(ticketQrModal.data.checkInTime)} />
                <TicketInfoRow label="Ticket Type" value="PARKING SESSION" />

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
                  Please save a screenshot of this ticket. At checkout, show the QR code to the staff for vehicle lookup.
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
                  Close Ticket
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
                Click outside the window or press ESC to close. This QR code is only used to find the ticket during checkout.
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
                Scan the vehicle plate at the exit gate first. Then show the customer's QR ticket to the camera so the system can verify the correct vehicle.
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
                If the QR ticket is invalid, staff may select a vehicle from the list only after the scanned plate matches that vehicle.
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
                        {checkoutData.durationHours ? `${checkoutData.durationHours} hours` : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>PRICE PER HOUR</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {checkoutData.pricePerHour ? `${formatCurrency(checkoutData.pricePerHour)} / hour` : "N/A"}
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
                        ? "Pay Overstay Fee"
                        : "Pay by QR Code or Cash"}
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
                          ? "Scan the PayOS QR code to pay the overstay fee."
                          : "The customer can scan the PayOS QR code or pay cash to the staff."}
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
                            {checkoutPaymentMessage || "Payment completed successfully."}
                          </span>
                        ) : (
                          checkoutPaymentMessage || "Waiting for payment..."
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
                            For cash payment, receive the full amount before clicking the button below to complete checkout.
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
                            Cash Payment Received
                          </button>
                        </div>
                      )}

                      {checkoutPaymentData?.checkoutUrl && checkoutPaymentStatus !== "PAID" && (
                        <button
                          type="button"
                          onClick={() => {
                            const paymentWindow = window.open(
                              checkoutPaymentData.checkoutUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );

                            if (paymentWindow) {
                              paymentWindow.opener = null;
                            }
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
                          Open PayOS Backup
                        </button>
                      )}
                    </>
                  )}

                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1rem", width: "100%", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <Zap size={13} fill="#60a5fa" /> Instant Confirmation
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <ShieldCheck size={13} fill="transparent" /> Secure Payment
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
  progress = 0,
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
      title="Click to select a license plate image"
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

        {isLoading && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "1.25rem",
              transform: "translateX(-50%)",
              padding: "0.45rem 0.75rem",
              borderRadius: "999px",
              background: "rgba(15, 23, 42, 0.85)",
              color: "#ffffff",
              fontSize: "0.75rem",
              fontWeight: 800,
              zIndex: 3,
              whiteSpace: "nowrap"
            }}
          >
            Recognizing with OCR {Math.max(0, Math.min(Number(progress) || 0, 100))}%
          </div>
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
