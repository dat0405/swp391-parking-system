export const normalizeVehicleType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  if (
    value.includes("bike") ||
    value.includes("motor") ||
    value.includes("xe máy") ||
    value.includes("motorbike")
  ) {
    return "motorbike";
  }

  return "car";
};

export const cleanPlateInput = (value) => {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

export const formatCarPlate = (value) => {
  const cleaned = cleanPlateInput(value);

  const province = cleaned.slice(0, 2);
  const letter = cleaned.slice(2, 3);
  const numbers = cleaned.slice(3, 8);

  let result = "";

  if (province) {
    result += province;
  }

  if (letter) {
    result += letter;
  }

  if (numbers.length > 0) {
    result += "-";
    result += numbers.slice(0, 3);
  }

  if (numbers.length > 3) {
    result += ".";
    result += numbers.slice(3, 5);
  }

  return result;
};

export const formatMotorbikePlate = (value) => {
  const cleaned = cleanPlateInput(value);

  const province = cleaned.slice(0, 2);
  const rest = cleaned.slice(2);

  let series = "";
  let numbers = "";

  /*
   * Motorbike plate examples:
   * 25-B1-258.88  -> raw: 25B125888
   * 29-K6-447.43  -> raw: 29K644743
   * 59-AA-123.56  -> raw: 59AA12356
   *
   * Structure:
   * province: 2 digits
   * series: 2 chars usually, such as B1, K6, AA
   * numbers: 5 digits, displayed as 258.88
   */
  if (rest.length <= 2) {
    series = rest;
    numbers = "";
  } else {
    series = rest.slice(0, 2);
    numbers = rest.slice(2, 7).replace(/\D/g, "");
  }

  let result = "";

  if (province) {
    result += province;
  }

  if (series) {
    result += "-";
    result += series;
  }

  if (numbers.length > 0) {
    result += "-";
    result += numbers.slice(0, 3);
  }

  if (numbers.length > 3) {
    result += ".";
    result += numbers.slice(3, 5);
  }

  return result;
};

export const formatPlateByVehicleType = (value, type) => {
  if (normalizeVehicleType(type) === "car") {
    return formatCarPlate(value);
  }

  return formatMotorbikePlate(value);
};

export const getPlatePlaceholder = (type) => {
  if (normalizeVehicleType(type) === "car") {
    return "e.g., 30F-256.58";
  }

  return "e.g., 25-B1-258.88 / 59-AA-123.56";
};

export const getPlateHint = (type) => {
  if (normalizeVehicleType(type) === "car") {
    return "Car format: 30F-256.58";
  }

  return "Motorbike format: 25-B1-258.88 or 59-AA-123.56";
};

export const validateVietnamPlate = (plate, type) => {
  const value = String(plate || "").trim().toUpperCase();

  const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
  const motorbikeRegex = /^\d{2}-[A-Z0-9]{2}-\d{3}\.\d{2}$/;

  if (normalizeVehicleType(type) === "car") {
    return carRegex.test(value);
  }

  return motorbikeRegex.test(value);
};

export const formatPlateForSearch = (value) => {
  const raw = String(value || "").toUpperCase();
  const cleaned = cleanPlateInput(raw);

  /*
   * Motorbike examples after clean:
   * 25B125888
   * 29K644743
   * 59AA12356
   *
   * Car example after clean:
   * 30F25658
   *
   * Because car and motorbike can look similar when cleaned,
   * keep this function compatible with both:
   * - if raw text already contains "-" after province and series, respect motorbike format
   * - if raw text contains a space, treat as old motorbike format
   * - otherwise fallback to car format for old search behavior
   */
  if (/^\d{2}-[A-Z0-9]{2}[-\s]/.test(raw) || raw.includes(" ")) {
    return formatMotorbikePlate(raw);
  }

  if (/^\d{2}[A-Z]{2}\d{5}$/.test(cleaned)) {
    return formatMotorbikePlate(cleaned);
  }

  if (/^\d{2}[A-Z]\d\d{5}$/.test(cleaned)) {
    return formatMotorbikePlate(cleaned);
  }

  return formatCarPlate(cleaned);
};