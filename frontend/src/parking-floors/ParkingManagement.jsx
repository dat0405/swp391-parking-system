import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import axiosClient from "../api/axiosClient";
import {
  Car,
  Clock,
  Wrench,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  X
} from "lucide-react";

const slotsPerPage = 25;

const statusFilters = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "occupied", label: "Occupied" },
  { key: "reserved", label: "Reserved" },
  { key: "maintenance", label: "Maintenance" }
];

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  inputFocus: "var(--bg-input-focus)",
  border: "var(--border-color)",
  borderSoft: "var(--border-soft)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  soft: "var(--text-soft)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  yellow: "var(--warning-yellow)",
  yellowSoft: "var(--warning-yellow-soft)",
  shadow: "var(--shadow-card)"
};

const normalizeStatus = (status) => {
  const value = String(status || "AVAILABLE").trim().toUpperCase();

  if (value === "OCCUPIED") return "occupied";
  if (value === "RESERVED") return "reserved";
  if (value === "MAINTENANCE") return "maintenance";

  return "available";
};

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

  if (value.includes("car") || value.includes("ô tô") || value.includes("oto")) {
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

const getDisplayVehicleType = (type) => {
  if (type === "motorbike") return "Motorbike";
  if (type === "car") return "Car";

  return type || "Unknown";
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

const getFloorId = (slot) => {
  return (
    slot.zone?.floor?.id ||
    slot.floor?.id ||
    slot.parkingFloor?.id ||
    slot.floorId ||
    slot.zone?.floorId ||
    null
  );
};

const getFacilityId = (slot) => {
  return (
    slot.zone?.floor?.facility?.id ||
    slot.zone?.floor?.facilityId ||
    slot.floor?.facility?.id ||
    slot.floor?.facilityId ||
    slot.parkingFloor?.facility?.id ||
    slot.parkingFloor?.facilityId ||
    slot.facilityId ||
    slot.parkingFacilityId ||
    null
  );
};

const getVehicleTypeId = (slot) => {
  return slot.vehicleType?.id || slot.vehicleTypeId || slot.typeId || null;
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

const normalizeFloorName = (floorName) => {
  return String(floorName || "Unknown").trim();
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

const getDisplayFloorName = (floorName) => {
  const value = normalizeFloorName(floorName);

  if (value.toUpperCase() === "G") {
    return "Floor G";
  }

  if (value.toLowerCase().startsWith("floor")) {
    return value;
  }

  return `Floor ${value}`;
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

const mapApiSlotToViewSlot = (slot) => {
  const finalStatus = normalizeStatus(slot.status);
  const slotCode = getSlotCode(slot);

  return {
    id: slot.id,
    slotCode,
    displayCode: slotCode,
    floor: getFloorCode(slot),
    floorId: getFloorId(slot),
    facilityId: getFacilityId(slot),
    type: getVehicleType(slot),
    vehicleTypeId: getVehicleTypeId(slot),
    vehicleTypeName: getVehicleTypeName(slot),
    status: finalStatus,
    info:
      slot.info ||
      slot.licensePlate ||
      slot.manualLicensePlate ||
      (finalStatus === "occupied"
        ? "Occupied"
        : finalStatus === "reserved"
          ? "Reserved"
          : finalStatus === "maintenance"
            ? "Maintenance"
            : "Available"),
    raw: slot
  };
};

const normalizeRole = (role) => {
  if (!role) return "";

  return String(role)
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
};

const getCurrentRole = () => {
  try {
    const savedUser = localStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : {};

    if (typeof parsedUser.role === "string") {
      return normalizeRole(parsedUser.role);
    }

    if (typeof parsedUser.roleName === "string") {
      return normalizeRole(parsedUser.roleName);
    }

    if (parsedUser.role && typeof parsedUser.role.roleName === "string") {
      return normalizeRole(parsedUser.role.roleName);
    }

    if (parsedUser.role && typeof parsedUser.role.name === "string") {
      return normalizeRole(parsedUser.role.name);
    }

    return normalizeRole(localStorage.getItem("user_role"));
  } catch (error) {
    return normalizeRole(localStorage.getItem("user_role"));
  }
};

const getStatusColor = (status) => {
  if (status === "occupied") return "#ef4444";
  if (status === "reserved") return "#f59e0b";
  if (status === "maintenance") return "#64748b";

  return "#10b981";
};

const getStatusSoftBackground = (status) => {
  if (status === "occupied") return "rgba(239, 68, 68, 0.1)";
  if (status === "reserved") return "rgba(245, 158, 11, 0.12)";
  if (status === "maintenance") return "rgba(100, 116, 139, 0.12)";

  return "rgba(16, 185, 129, 0.1)";
};

const getStatColor = (key) => {
  if (key === "available") return "var(--success-green)";
  if (key === "occupied") return "var(--danger-red)";
  if (key === "reserved") return "var(--warning-yellow)";
  if (key === "maintenance") return "var(--text-muted)";

  return "var(--text-main)";
};

const ParkingManagement = () => {
  const [slotsData, setSlotsData] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("");
  const selectedFloorRef = useRef("");

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [editingSlot, setEditingSlot] = useState(null);
  const [manualLicensePlate, setManualLicensePlate] = useState("");
  const [slotStatusLoading, setSlotStatusLoading] = useState(false);
  const [slotStatusError, setSlotStatusError] = useState("");

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotAction, setSlotAction] = useState("ADD");
  const [selectedModalFloorId, setSelectedModalFloorId] = useState("");

  const [carSlotQuantity, setCarSlotQuantity] = useState(0);
  const [motorbikeSlotQuantity, setMotorbikeSlotQuantity] = useState(0);

  const [createFloorName, setCreateFloorName] = useState("");
  const [createCarSlotQuantity, setCreateCarSlotQuantity] = useState(0);
  const [createMotorbikeSlotQuantity, setCreateMotorbikeSlotQuantity] =
    useState(0);

  const [slotModalLoading, setSlotModalLoading] = useState(false);
  const [slotModalError, setSlotModalError] = useState("");
  const [slotModalSuccess, setSlotModalSuccess] = useState("");

  const currentRole = getCurrentRole();
  const normalizedRole = currentRole;

  const canManageSlots = [
    "SYSTEM_ADMIN",
    "PARKING_MANAGER",
    "PARKING_STAFF"
  ].includes(normalizedRole);

  const isReadOnlyViewer = !canManageSlots;

  useEffect(() => {
    selectedFloorRef.current = selectedFloor;
  }, [selectedFloor]);

  const buildNormalizedDisplaySlots = (slots) => {
    const mappedSlots = slots
      .map(mapApiSlotToViewSlot)
      .sort((slotA, slotB) => {
        const floorCompare =
          getFloorSortValue(slotA.floor) - getFloorSortValue(slotB.floor);

        if (floorCompare !== 0) {
          return floorCompare;
        }

        return Number(slotA.id) - Number(slotB.id);
      });

    const floorCounters = new Map();

    return mappedSlots.map((slot) => {
      const floorKey = slot.floor || "Unknown";
      const currentCount = floorCounters.get(floorKey) || 0;
      const nextNumber = currentCount + 1;

      floorCounters.set(floorKey, nextNumber);

      const prefix = getDisplayPrefixByFloor(slot.floor);
      const displayCode = `${prefix}-${String(nextNumber).padStart(2, "0")}`;

      return {
        ...slot,
        displayCode
      };
    });
  };

  const loadParkingSlots = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setErrorMessage("");

      const response = await axiosClient.get("/parking-slots");
      const payload = response.data;

      const slots = Array.isArray(payload)
        ? payload
        : payload.content || payload.data || payload.slots || [];

      const normalizedDisplaySlots = buildNormalizedDisplaySlots(slots);

      setSlotsData(normalizedDisplaySlots);
      setHasLoadedOnce(true);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error("Failed to load parking slots:", error);
      setErrorMessage("Không thể tải dữ liệu parking slots từ backend.");

      if (!hasLoadedOnceRef.current) {
        setSlotsData([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadParkingSlots();

    const intervalId = setInterval(() => {
      loadParkingSlots({ silent: true });
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const floors = useMemo(() => {
    const floorMap = new Map();

    slotsData.forEach((slot) => {
      if (!floorMap.has(slot.floor)) {
        floorMap.set(slot.floor, {
          id: slot.floor,
          floorId: slot.floorId,
          name: getDisplayFloorName(slot.floor),
          rawName: slot.floor
        });
      }
    });

    return Array.from(floorMap.values()).sort((a, b) => {
      return getFloorSortValue(a.rawName) - getFloorSortValue(b.rawName);
    });
  }, [slotsData]);

  const modalFloorOptions = useMemo(() => {
    const floorMap = new Map();

    slotsData.forEach((slot) => {
      if (!slot.floorId) return;

      if (!floorMap.has(slot.floorId)) {
        floorMap.set(slot.floorId, {
          id: slot.floorId,
          name: getDisplayFloorName(slot.floor),
          rawName: slot.floor,
          facilityId: slot.facilityId
        });
      }
    });

    return Array.from(floorMap.values()).sort((a, b) => {
      return getFloorSortValue(a.rawName) - getFloorSortValue(b.rawName);
    });
  }, [slotsData]);

  const modalVehicleTypeOptions = useMemo(() => {
    const vehicleTypeMap = new Map();

    slotsData.forEach((slot) => {
      if (!slot.vehicleTypeId) return;

      if (!vehicleTypeMap.has(slot.vehicleTypeId)) {
        vehicleTypeMap.set(slot.vehicleTypeId, {
          id: slot.vehicleTypeId,
          name: getDisplayVehicleType(slot.type),
          normalizedType: slot.type
        });
      }
    });

    return Array.from(vehicleTypeMap.values()).sort((a, b) => {
      return a.id - b.id;
    });
  }, [slotsData]);

  useEffect(() => {
    if (floors.length === 0) return;

    const currentSelectedFloor = selectedFloorRef.current;

    if (!currentSelectedFloor) {
      setSelectedFloor(floors[0].id);
      selectedFloorRef.current = floors[0].id;
      setCurrentPage(1);
      return;
    }

    const exists = floors.some((floor) => floor.id === currentSelectedFloor);

    if (!exists) {
      setSelectedFloor(floors[0].id);
      selectedFloorRef.current = floors[0].id;
      setCurrentPage(1);
    }
  }, [floors]);

  const floorSlots = useMemo(() => {
    return slotsData.filter((slot) => slot.floor === selectedFloor);
  }, [slotsData, selectedFloor]);

  const filteredSlots = useMemo(() => {
    if (selectedStatus === "all") {
      return floorSlots;
    }

    return floorSlots.filter((slot) => slot.status === selectedStatus);
  }, [floorSlots, selectedStatus]);

  const totalPages = Math.max(Math.ceil(filteredSlots.length / slotsPerPage), 1);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const indexOfLastSlot = currentPage * slotsPerPage;
  const indexOfFirstSlot = indexOfLastSlot - slotsPerPage;
  const currentSlots = filteredSlots.slice(indexOfFirstSlot, indexOfLastSlot);

  const showingStart = filteredSlots.length === 0 ? 0 : indexOfFirstSlot + 1;
  const showingEnd = Math.min(indexOfLastSlot, filteredSlots.length);

  const stats = {
    total: slotsData.length,
    available: slotsData.filter((slot) => slot.status === "available").length,
    occupied: slotsData.filter((slot) => slot.status === "occupied").length,
    reserved: slotsData.filter((slot) => slot.status === "reserved").length,
    maintenance: slotsData.filter((slot) => slot.status === "maintenance").length
  };

  const handleFloorChange = (floor) => {
    setSelectedFloor(floor);
    selectedFloorRef.current = floor;
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const getFloorButtonName = (floor) => {
    return floor.name;
  };

  const getStatusCountForCurrentFloor = (status) => {
    if (status === "all") {
      return floorSlots.length;
    }

    return floorSlots.filter((slot) => slot.status === status).length;
  };

  const getDefaultFacilityId = () => {
    const selectedFloorOption = modalFloorOptions.find(
      (floor) => String(floor.id) === String(selectedModalFloorId)
    );

    return (
      selectedFloorOption?.facilityId ||
      modalFloorOptions.find((floor) => floor.facilityId)?.facilityId ||
      slotsData.find((slot) => slot.facilityId)?.facilityId ||
      1
    );
  };

  const getVehicleTypeOptionByKind = (kind) => {
    return modalVehicleTypeOptions.find((vehicleType) => {
      const normalizedType = String(vehicleType.normalizedType || "").toLowerCase();
      const name = String(vehicleType.name || "").toLowerCase();

      if (kind === "car") {
        return (
          normalizedType === "car" ||
          name.includes("car") ||
          name.includes("ô tô") ||
          name.includes("oto")
        );
      }

      return (
        normalizedType === "motorbike" ||
        name.includes("motor") ||
        name.includes("bike") ||
        name.includes("xe máy")
      );
    });
  };

  const normalizeQuantityNumber = (value) => {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue) || numberValue < 0) {
      return 0;
    }

    return Math.floor(numberValue);
  };

  const validateDualQuantity = (carQuantity, motorbikeQuantity) => {
    const normalizedCarQuantity = normalizeQuantityNumber(carQuantity);
    const normalizedMotorbikeQuantity = normalizeQuantityNumber(motorbikeQuantity);

    if (normalizedCarQuantity === 0 && normalizedMotorbikeQuantity === 0) {
      return "Please enter Car slots or Motorbike slots greater than 0.";
    }

    if (normalizedCarQuantity > 500 || normalizedMotorbikeQuantity > 500) {
      return "Each quantity cannot be greater than 500.";
    }

    return "";
  };

  const submitSlotQuantityRequests = async ({
    floorId,
    carQuantity,
    motorbikeQuantity,
    action
  }) => {
    const carVehicleType = getVehicleTypeOptionByKind("car");
    const motorbikeVehicleType = getVehicleTypeOptionByKind("motorbike");

    const requests = [];

    if (normalizeQuantityNumber(carQuantity) > 0) {
      if (!carVehicleType?.id) {
        throw new Error("Car vehicle type was not found in database.");
      }

      requests.push({
        floorId: Number(floorId),
        vehicleTypeId: Number(carVehicleType.id),
        quantity: normalizeQuantityNumber(carQuantity)
      });
    }

    if (normalizeQuantityNumber(motorbikeQuantity) > 0) {
      if (!motorbikeVehicleType?.id) {
        throw new Error("Motorbike vehicle type was not found in database.");
      }

      requests.push({
        floorId: Number(floorId),
        vehicleTypeId: Number(motorbikeVehicleType.id),
        quantity: normalizeQuantityNumber(motorbikeQuantity)
      });
    }

    for (const payload of requests) {
      if (action === "ADD") {
        await axiosClient.post("/parking-slots/bulk-create", payload);
      } else {
        await axiosClient.post("/parking-slots/bulk-delete", payload);
      }
    }
  };

  const openSlotModal = () => {
    if (!canManageSlots) return;

    setSlotAction("ADD");
    setSlotModalError("");
    setSlotModalSuccess("");

    setCarSlotQuantity(0);
    setMotorbikeSlotQuantity(0);
    setCreateFloorName("");
    setCreateCarSlotQuantity(0);
    setCreateMotorbikeSlotQuantity(0);

    const currentFloor = floors.find((floor) => floor.id === selectedFloor);
    const defaultFloorId = currentFloor?.floorId || modalFloorOptions[0]?.id || "";

    setSelectedModalFloorId(defaultFloorId ? String(defaultFloorId) : "");
    setIsSlotModalOpen(true);
  };

  const validateModalSelection = () => {
    if (slotAction === "CREATE_FLOOR") {
      if (!createFloorName.trim()) {
        return "Floor name is required.";
      }

      return validateDualQuantity(
        createCarSlotQuantity,
        createMotorbikeSlotQuantity
      );
    }

    const selectedFloorOption = modalFloorOptions.find(
      (floor) => String(floor.id) === String(selectedModalFloorId)
    );

    if (!selectedFloorOption) {
      return "Please select floor.";
    }

    if (slotAction === "DELETE_FLOOR") {
      return "";
    }

    return validateDualQuantity(carSlotQuantity, motorbikeSlotQuantity);
  };

  const handleSubmitSlotManagement = async () => {
    if (!canManageSlots) return;

    try {
      setSlotModalLoading(true);
      setSlotModalError("");
      setSlotModalSuccess("");

      const validationMessage = validateModalSelection();

      if (validationMessage) {
        setSlotModalError(validationMessage);
        return;
      }

      if (slotAction === "CREATE_FLOOR") {
        const createFloorResponse = await axiosClient.post("/parking-floors", {
          facilityId: getDefaultFacilityId(),
          floorName: createFloorName.trim()
        });

        const createdFloor = createFloorResponse.data;

        await submitSlotQuantityRequests({
          floorId: createdFloor.id,
          carQuantity: createCarSlotQuantity,
          motorbikeQuantity: createMotorbikeSlotQuantity,
          action: "ADD"
        });

        setSlotModalSuccess("Floor created successfully.");
      } else if (slotAction === "DELETE_FLOOR") {
        await axiosClient.delete(`/parking-floors/${selectedModalFloorId}`);

        setSlotModalSuccess("Parking floor deleted successfully.");
      } else {
        await submitSlotQuantityRequests({
          floorId: selectedModalFloorId,
          carQuantity: carSlotQuantity,
          motorbikeQuantity: motorbikeSlotQuantity,
          action: slotAction
        });

        setSlotModalSuccess(
          slotAction === "ADD"
            ? "Parking slots added successfully."
            : "Parking slots deleted successfully."
        );
      }

      await loadParkingSlots();

      setTimeout(() => {
        setIsSlotModalOpen(false);
        setSlotModalSuccess("");
      }, 700);
    } catch (error) {
      console.error("Failed to manage slots:", error);

      setSlotModalError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data ||
          error.message ||
          "Failed to update parking slots."
      );
    } finally {
      setSlotModalLoading(false);
    }
  };

  const openIncidentModal = (slot) => {
    if (!canManageSlots) return;

    setEditingSlot(slot);
    setManualLicensePlate("");
    setSlotStatusError("");
  };

  const closeIncidentModal = () => {
    if (slotStatusLoading) return;

    setEditingSlot(null);
    setManualLicensePlate("");
    setSlotStatusError("");
  };

  const getUpdatedInfoByStatus = (statusType) => {
    if (statusType === "occupied") {
      return manualLicensePlate.trim() || "Occupied";
    }

    if (statusType === "available") return "Available";
    if (statusType === "reserved") return "Reserved";
    if (statusType === "maintenance") return "Maintenance";

    return "Available";
  };

  const handleUpdateSlotStatus = async (statusType) => {
    if (!canManageSlots || !editingSlot) return;

    try {
      setSlotStatusLoading(true);
      setSlotStatusError("");

      const updatedInfo = getUpdatedInfoByStatus(statusType);
      const licensePlateValue = manualLicensePlate.trim() || null;

      const payload = {
        status: statusType.toUpperCase(),
        info: updatedInfo,
        manualLicensePlate: licensePlateValue,
        licensePlate: licensePlateValue
      };

      await axiosClient.patch(`/parking-slots/${editingSlot.id}/status`, payload);

      setSlotsData((prevSlots) =>
        prevSlots.map((slot) => {
          if (slot.id === editingSlot.id) {
            return {
              ...slot,
              status: statusType,
              info: updatedInfo
            };
          }

          return slot;
        })
      );

      setEditingSlot(null);
      setManualLicensePlate("");

      await loadParkingSlots({ silent: true });
    } catch (error) {
      console.error("Failed to update slot status:", error);

      setSlotStatusError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data ||
          "Không thể cập nhật trạng thái slot. Kiểm tra lại API backend."
      );
    } finally {
      setSlotStatusLoading(false);
    }
  };

  const renderSlotCards = () => {
    return currentSlots.map((slot) => {
      const statusColor = getStatusColor(slot.status);
      const statusSoftBackground = getStatusSoftBackground(slot.status);

      let statusIcon = (
        <span
          style={{
            fontSize: "1.35rem",
            color: statusColor,
            fontWeight: "bold"
          }}
        >
          P
        </span>
      );

      if (slot.status === "occupied") {
        statusIcon = <Car size={26} />;
      } else if (slot.status === "reserved") {
        statusIcon = <Clock size={26} />;
      } else if (slot.status === "maintenance") {
        statusIcon = <Wrench size={26} />;
      }

      return (
        <div
          key={`${slot.id}-${slot.slotCode}`}
          onClick={canManageSlots ? () => openIncidentModal(slot) : undefined}
          title={canManageSlots ? "Click to configure this slot" : "View-only slot status"}
          className="feature-card-glass"
          style={{
            border: `1px solid ${statusColor}`,
            borderTop: `4px solid ${statusColor}`,
            padding: "1rem",
            borderRadius: "0.9rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: "124px",
            cursor: canManageSlots ? "pointer" : "default",
            boxShadow: theme.shadow,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${statusSoftBackground} 0%, transparent 45%)`,
              pointerEvents: "none"
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.5rem"
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h4
                style={{
                  margin: 0,
                  color: theme.text,
                  fontSize: "1rem",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {slot.displayCode}
              </h4>

              <span
                style={{
                  fontSize: "0.78rem",
                  color: theme.muted,
                  fontWeight: "700"
                }}
              >
                {getDisplayVehicleType(slot.type)}
              </span>
            </div>

            <span
              style={{
                fontSize: "0.62rem",
                color: statusColor,
                fontWeight: "800",
                textTransform: "uppercase",
                whiteSpace: "nowrap"
              }}
            >
              {slot.status}
            </span>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: statusColor,
              paddingTop: "0.2rem"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: statusSoftBackground,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {statusIcon}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              textAlign: "center",
              fontSize: "0.78rem",
              color: theme.muted,
              fontWeight: "700",
              background: statusSoftBackground,
              padding: "4px 8px",
              borderRadius: "999px",
              alignSelf: "center",
              minWidth: "92px"
            }}
          >
            {slot.info}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          overflowY: "auto",
          color: theme.text
        }}
      >
        <Header />

        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              color: theme.text,
              fontSize: "1.75rem",
              margin: "0"
            }}
          >
            Parking Floors & Slots
          </h1>

          <p style={{ color: theme.muted, margin: "0.5rem 0" }}>
            {isReadOnlyViewer
              ? "View current parking slot availability and status."
              : "Live parking slot data from database."}
          </p>
        </div>

        <div
          className="stats-bar"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "0.85rem",
            marginBottom: "1.5rem"
          }}
        >
          {[
            { key: "total", label: "TOTAL SLOTS", val: stats.total },
            { key: "available", label: "AVAILABLE", val: stats.available },
            { key: "occupied", label: "OCCUPIED", val: stats.occupied },
            { key: "reserved", label: "RESERVED", val: stats.reserved },
            { key: "maintenance", label: "MAINTENANCE", val: stats.maintenance }
          ].map((item) => (
            <div
              key={item.label}
              className="feature-card-glass"
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                position: "relative",
                minHeight: "76px",
                boxShadow: theme.shadow
              }}
            >
              {item.label === "TOTAL SLOTS" && canManageSlots && (
                <button
                  type="button"
                  onClick={openSlotModal}
                  title="Manage parking slots"
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    width: "30px",
                    height: "30px",
                    borderRadius: "10px",
                    border: "1px solid rgba(59, 130, 246, 0.5)",
                    background: "var(--primary-blue)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <Plus size={17} />
                </button>
              )}

              <span
                style={{
                  fontSize: "0.7rem",
                  color: theme.muted,
                  fontWeight: "bold"
                }}
              >
                {item.label}
              </span>

              <p
                style={{
                  fontSize: "1.55rem",
                  fontWeight: "bold",
                  margin: "0.45rem 0 0 0",
                  color: getStatColor(item.key)
                }}
              >
                {item.val.toLocaleString("vi-VN")}
              </p>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div
            style={{
              background: theme.redSoft,
              border: `1px solid ${theme.red}`,
              color: theme.red,
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              fontWeight: "700"
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <div
            className="feature-card-glass"
            style={{
              padding: "0.85rem",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.85rem",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {floors.map((floor) => {
                  const active = selectedFloor === floor.id;

                  return (
                    <button
                      key={floor.id}
                      onClick={() => handleFloorChange(floor.id)}
                      style={{
                        padding: "0.55rem 1rem",
                        borderRadius: "0.5rem",
                        border: active
                          ? "1px solid var(--primary-blue)"
                          : `1px solid ${theme.border}`,
                        background: active ? "var(--primary-blue)" : "var(--bg-input)",
                        color: active ? "#ffffff" : theme.text,
                        cursor: "pointer",
                        fontWeight: "700"
                      }}
                    >
                      {getFloorButtonName(floor)}
                    </button>
                  );
                })}

                {!loading && floors.length === 0 && (
                  <span style={{ color: theme.muted }}>
                    Không có dữ liệu floor/slot trong database.
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap"
                }}
              >
                <button
                  onClick={() => loadParkingSlots()}
                  disabled={loading}
                  style={{
                    background: "var(--bg-input)",
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    padding: "0.45rem 0.7rem",
                    borderRadius: "0.5rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontWeight: "700"
                  }}
                >
                  <RefreshCw size={15} />
                  {loading ? "Loading" : "Refresh"}
                </button>

                <span style={{ color: theme.muted, fontSize: "0.85rem" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  style={{
                    background: "var(--bg-input)",
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    padding: "0.45rem",
                    borderRadius: "0.5rem",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  style={{
                    background: "var(--bg-input)",
                    border: `1px solid ${theme.border}`,
                    color: theme.text,
                    padding: "0.45rem",
                    borderRadius: "0.5rem",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap"
              }}
            >
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                {statusFilters.map((filter) => {
                  const isActive = selectedStatus === filter.key;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => handleStatusFilterChange(filter.key)}
                      style={{
                        padding: "0.4rem 0.75rem",
                        borderRadius: "999px",
                        border: isActive
                          ? "1px solid var(--primary-blue)"
                          : `1px solid ${theme.border}`,
                        background: isActive ? theme.blueSoft : "var(--bg-input)",
                        color: isActive ? "var(--primary-blue)" : theme.muted,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      {filter.label} ({getStatusCountForCurrentFloor(filter.key)})
                    </button>
                  );
                })}
              </div>

              <span
                style={{
                  color: theme.muted,
                  fontSize: "0.82rem",
                  fontWeight: 700
                }}
              >
                Showing {showingStart}-{showingEnd} of {filteredSlots.length} slots
              </span>
            </div>
          </div>
        </div>

        <div style={{ minHeight: "180px", transition: "none" }}>
          {loading && !hasLoadedOnce ? (
            <div
              className="feature-card-glass"
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                color: theme.muted,
                textAlign: "center",
                boxShadow: theme.shadow
              }}
            >
              Đang tải dữ liệu parking slots...
            </div>
          ) : currentSlots.length > 0 ? (
            <div
              className="slots-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: "0.85rem"
              }}
            >
              {renderSlotCards()}
            </div>
          ) : (
            <div
              className="feature-card-glass"
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                color: theme.muted,
                textAlign: "center",
                boxShadow: theme.shadow
              }}
            >
              No slots match the selected status filter.
            </div>
          )}
        </div>
      </main>

      {canManageSlots && editingSlot && (
        <IncidentModal
          editingSlot={editingSlot}
          manualLicensePlate={manualLicensePlate}
          setManualLicensePlate={setManualLicensePlate}
          slotStatusLoading={slotStatusLoading}
          slotStatusError={slotStatusError}
          handleUpdateSlotStatus={handleUpdateSlotStatus}
          closeIncidentModal={closeIncidentModal}
        />
      )}

      {canManageSlots && isSlotModalOpen && (
        <ManageSlotModal
          slotAction={slotAction}
          setSlotAction={setSlotAction}
          slotModalLoading={slotModalLoading}
          slotModalError={slotModalError}
          slotModalSuccess={slotModalSuccess}
          selectedModalFloorId={selectedModalFloorId}
          setSelectedModalFloorId={setSelectedModalFloorId}
          carSlotQuantity={carSlotQuantity}
          setCarSlotQuantity={setCarSlotQuantity}
          motorbikeSlotQuantity={motorbikeSlotQuantity}
          setMotorbikeSlotQuantity={setMotorbikeSlotQuantity}
          createFloorName={createFloorName}
          setCreateFloorName={setCreateFloorName}
          createCarSlotQuantity={createCarSlotQuantity}
          setCreateCarSlotQuantity={setCreateCarSlotQuantity}
          createMotorbikeSlotQuantity={createMotorbikeSlotQuantity}
          setCreateMotorbikeSlotQuantity={setCreateMotorbikeSlotQuantity}
          modalFloorOptions={modalFloorOptions}
          setIsSlotModalOpen={setIsSlotModalOpen}
          setSlotModalError={setSlotModalError}
          setSlotModalSuccess={setSlotModalSuccess}
          handleSubmitSlotManagement={handleSubmitSlotManagement}
        />
      )}
    </div>
  );
};

function IncidentModal({
  editingSlot,
  manualLicensePlate,
  setManualLicensePlate,
  slotStatusLoading,
  slotStatusError,
  handleUpdateSlotStatus,
  closeIncidentModal
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.68)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99998,
        padding: "1rem"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: theme.card,
          border: `1px solid ${theme.border}`,
          padding: "1.5rem",
          borderRadius: "0.85rem",
          color: theme.text,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)"
        }}
      >
        <h3
          style={{
            color: theme.text,
            margin: "0 0 1.25rem 0",
            fontSize: "1.2rem"
          }}
        >
          Incident Config: Slot {editingSlot.displayCode}
        </h3>

        <div style={{ marginBottom: "1.35rem" }}>
          <label
            style={{
              color: theme.muted,
              fontSize: "0.85rem",
              display: "block",
              marginBottom: "0.5rem",
              lineHeight: 1.35
            }}
          >
            Manual License Plate (Use if system failed to sync check-in):
          </label>

          <input
            type="text"
            placeholder="e.g., NY-8291-K"
            value={manualLicensePlate}
            onChange={(event) => setManualLicensePlate(event.target.value)}
            disabled={slotStatusLoading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: "40px",
              padding: "0 0.75rem",
              borderRadius: "0.45rem",
              border: `1px solid ${theme.border}`,
              background: theme.input,
              color: theme.text,
              outline: "none"
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.65rem",
            marginBottom: "1rem"
          }}
        >
          <StatusButton
            label="Occupied"
            color="#ef4444"
            disabled={slotStatusLoading}
            onClick={() => handleUpdateSlotStatus("occupied")}
          />

          <StatusButton
            label="Available (Clear)"
            color="#10b981"
            disabled={slotStatusLoading}
            onClick={() => handleUpdateSlotStatus("available")}
          />

          <StatusButton
            label="Reserved"
            color="#f59e0b"
            disabled={slotStatusLoading}
            onClick={() => handleUpdateSlotStatus("reserved")}
          />

          <StatusButton
            label="Maintenance"
            color="#64748b"
            disabled={slotStatusLoading}
            onClick={() => handleUpdateSlotStatus("maintenance")}
          />
        </div>

        {slotStatusError && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              borderRadius: "0.55rem",
              background: theme.redSoft,
              border: `1px solid ${theme.red}`,
              color: theme.red,
              fontSize: "0.85rem",
              fontWeight: "700"
            }}
          >
            {slotStatusError}
          </div>
        )}

        <button
          type="button"
          onClick={closeIncidentModal}
          disabled={slotStatusLoading}
          style={{
            width: "100%",
            padding: "0.65rem",
            background: "transparent",
            color: theme.muted,
            border: `1px solid ${theme.border}`,
            borderRadius: "0.45rem",
            cursor: slotStatusLoading ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {slotStatusLoading ? "Updating..." : "Cancel"}
        </button>
      </div>
    </div>
  );
}

function StatusButton({ label, color, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.75rem",
        background: color,
        color: "#ffffff",
        border: "none",
        borderRadius: "0.45rem",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "700"
      }}
    >
      {label}
    </button>
  );
}

function ManageSlotModal({
  slotAction,
  setSlotAction,
  slotModalLoading,
  slotModalError,
  slotModalSuccess,
  selectedModalFloorId,
  setSelectedModalFloorId,
  carSlotQuantity,
  setCarSlotQuantity,
  motorbikeSlotQuantity,
  setMotorbikeSlotQuantity,
  createFloorName,
  setCreateFloorName,
  createCarSlotQuantity,
  setCreateCarSlotQuantity,
  createMotorbikeSlotQuantity,
  setCreateMotorbikeSlotQuantity,
  modalFloorOptions,
  setIsSlotModalOpen,
  setSlotModalError,
  setSlotModalSuccess,
  handleSubmitSlotManagement
}) {
  const isCreateFloor = slotAction === "CREATE_FLOOR";
  const isDeleteFloor = slotAction === "DELETE_FLOOR";

  const resetMessage = () => {
    setSlotModalError("");
    setSlotModalSuccess("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.68)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          color: theme.text,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.2rem"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: theme.text }}>
              Manage parking slots
            </h3>
            <p style={{ margin: "0.35rem 0 0", color: theme.muted }}>
              Add slots, delete slots, create floors, or delete unused floors.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSlotModalOpen(false)}
            disabled={slotModalLoading}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: `1px solid ${theme.border}`,
              background: theme.input,
              color: theme.text,
              cursor: slotModalLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            background: theme.cardSoft,
            padding: "0.25rem",
            borderRadius: "0.75rem",
            marginBottom: "1rem"
          }}
        >
          {[
            { key: "ADD", label: "Add slots", color: "#2563eb" },
            { key: "DELETE", label: "Delete slots", color: "#dc2626" },
            { key: "CREATE_FLOOR", label: "Create floor", color: "#16a34a" },
            { key: "DELETE_FLOOR", label: "Delete floor", color: "#b91c1c" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSlotAction(tab.key);
                resetMessage();
              }}
              style={{
                border: "none",
                borderRadius: "0.6rem",
                padding: "0.75rem",
                background: slotAction === tab.key ? tab.color : "transparent",
                color: slotAction === tab.key ? "#ffffff" : theme.text,
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isCreateFloor ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            <ModalField label="Floor name">
              <input
                type="text"
                value={createFloorName}
                onChange={(event) => setCreateFloorName(event.target.value)}
                disabled={slotModalLoading}
                placeholder="Example: Floor 3"
                style={inputStyle}
              />
            </ModalField>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem"
              }}
            >
              <ModalField label="Initial Car slots">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={createCarSlotQuantity}
                  onChange={(event) => setCreateCarSlotQuantity(event.target.value)}
                  disabled={slotModalLoading}
                  placeholder="0"
                  style={inputStyle}
                />
              </ModalField>

              <ModalField label="Initial Motorbike slots">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={createMotorbikeSlotQuantity}
                  onChange={(event) =>
                    setCreateMotorbikeSlotQuantity(event.target.value)
                  }
                  disabled={slotModalLoading}
                  placeholder="0"
                  style={inputStyle}
                />
              </ModalField>
            </div>
          </div>
        ) : isDeleteFloor ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            <ModalField label="Floor">
              <select
                value={selectedModalFloorId}
                onChange={(event) => setSelectedModalFloorId(event.target.value)}
                disabled={slotModalLoading}
                style={inputStyle}
              >
                <option value="">Select floor</option>
                {modalFloorOptions.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </ModalField>

            <div
              style={{
                padding: "0.85rem",
                borderRadius: "0.75rem",
                background: theme.redSoft,
                border: `1px solid ${theme.red}`,
                color: theme.red,
                fontSize: "0.85rem",
                fontWeight: 800,
                lineHeight: 1.45
              }}
            >
              Warning: This will delete the selected floor and all deletable slots
              inside it. Backend should block deletion if the floor has occupied,
              reserved, maintenance slots, or parking session history.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <ModalField label="Floor">
              <select
                value={selectedModalFloorId}
                onChange={(event) => setSelectedModalFloorId(event.target.value)}
                disabled={slotModalLoading}
                style={inputStyle}
              >
                <option value="">Select floor</option>
                {modalFloorOptions.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </ModalField>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem"
              }}
            >
              <ModalField label="Car slots">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={carSlotQuantity}
                  onChange={(event) => setCarSlotQuantity(event.target.value)}
                  disabled={slotModalLoading}
                  placeholder="0"
                  style={inputStyle}
                />
              </ModalField>

              <ModalField label="Motorbike slots">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={motorbikeSlotQuantity}
                  onChange={(event) =>
                    setMotorbikeSlotQuantity(event.target.value)
                  }
                  disabled={slotModalLoading}
                  placeholder="0"
                  style={inputStyle}
                />
              </ModalField>
            </div>

            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.65rem",
                background: theme.cardSoft,
                border: `1px solid ${theme.borderSoft}`,
                color: theme.muted,
                fontSize: "0.82rem",
                fontWeight: 700
              }}
            >
              Enter 0 for the vehicle type you do not want to update.
            </div>
          </div>
        )}

        {slotModalError && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "0.65rem",
              background: theme.redSoft,
              border: `1px solid ${theme.red}`,
              color: theme.red,
              fontSize: "0.85rem",
              fontWeight: "700"
            }}
          >
            {slotModalError}
          </div>
        )}

        {slotModalSuccess && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "0.65rem",
              background: theme.greenSoft,
              border: `1px solid ${theme.green}`,
              color: theme.green,
              fontSize: "0.85rem",
              fontWeight: "700"
            }}
          >
            {slotModalSuccess}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1.5rem"
          }}
        >
          <button
            type="button"
            onClick={() => setIsSlotModalOpen(false)}
            disabled={slotModalLoading}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "0.65rem",
              border: `1px solid ${theme.border}`,
              background: theme.input,
              color: theme.text,
              cursor: slotModalLoading ? "not-allowed" : "pointer",
              fontWeight: 700
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmitSlotManagement}
            disabled={slotModalLoading}
            style={{
              height: "42px",
              padding: "0 1rem",
              borderRadius: "0.65rem",
              border: "none",
              background:
                slotAction === "DELETE" || slotAction === "DELETE_FLOOR"
                  ? "#dc2626"
                  : slotAction === "CREATE_FLOOR"
                    ? "#16a34a"
                    : "#2563eb",
              color: "#ffffff",
              cursor: slotModalLoading ? "not-allowed" : "pointer",
              fontWeight: 700
            }}
          >
            {slotModalLoading
              ? "Processing..."
              : slotAction === "DELETE"
                ? "Delete slots"
                : slotAction === "CREATE_FLOOR"
                  ? "Create floor"
                  : slotAction === "DELETE_FLOOR"
                    ? "Delete floor"
                    : "Add slots"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.45rem",
        color: theme.muted,
        fontWeight: "700",
        fontSize: "0.85rem"
      }}
    >
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  height: "44px",
  borderRadius: "0.65rem",
  border: "1px solid var(--border-color)",
  background: "var(--bg-input)",
  color: "var(--text-main)",
  padding: "0 0.75rem"
};

export default ParkingManagement;