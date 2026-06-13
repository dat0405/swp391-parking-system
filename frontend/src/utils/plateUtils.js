export const normalizeVehicleType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  if (value.includes("bike") || value.includes("motor")) {
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

  if (rest.length <= 3) {
    series = rest;
  } else {
    series = rest.slice(0, Math.max(rest.length - 5, 0));
    numbers = rest.slice(-5);
  }

  series = series.slice(0, 3);
  numbers = numbers.slice(0, 5);

  let result = "";

  if (province) {
    result += province;
  }

  if (series) {
    result += "-";
    result += series;
  }

  if (numbers.length > 0) {
    result += " ";
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

  return "e.g., 29-K6 447.43 / 59-AA 123.56";
};

export const getPlateHint = (type) => {
  if (normalizeVehicleType(type) === "car") {
    return "Car format: 30F-256.58";
  }

  return "Motorbike format: 29-K6 447.43 or 59-AA 123.56";
};

export const validateVietnamPlate = (plate, type) => {
  const value = String(plate || "").trim().toUpperCase();

  const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
  const motorbikeRegex = /^\d{2}-[A-Z]{1,2}\d?\s\d{3}\.\d{2}$/;

  if (normalizeVehicleType(type) === "car") {
    return carRegex.test(value);
  }

  return motorbikeRegex.test(value);
};

export const formatPlateForSearch = (value) => {
  const raw = String(value || "").toUpperCase();

  if (raw.includes(" ")) {
    return formatMotorbikePlate(raw);
  }

  const cleaned = cleanPlateInput(raw);

  if (/^\d{2}[A-Z]\d/.test(cleaned) || /^\d{2}[A-Z]{2}/.test(cleaned)) {
    return formatMotorbikePlate(cleaned);
  }

  return formatCarPlate(cleaned);
};