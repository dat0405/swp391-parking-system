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
  return (
    slot.slotCode ||
    slot.code ||
    slot.slotName ||
    slot.name ||
    slot.slotNumber ||
    `SLOT-${slot.id}`
  );
};

const getFloorDisplayPrefix = (slot) => {
  const floorValue = String(slot?.floor || "").trim().toUpperCase();
  const rawFloorValue = String(slot?.raw?.floorName || slot?.raw?.floorCode || "").trim().toUpperCase();
  const slotCodeValue = String(slot?.slotCode || slot?.id || "").trim().toUpperCase();

  if (
    floorValue === "G" ||
    floorValue === "GROUND" ||
    floorValue === "FLOOR G" ||
    rawFloorValue === "G" ||
    rawFloorValue === "GROUND" ||
    rawFloorValue === "FLOOR G" ||
    slotCodeValue.startsWith("G-") ||
    slotCodeValue.includes("BIKE") ||
    slotCodeValue.includes("MOTORBIKE")
  ) {
    return "G";
  }

  if (
    floorValue === "1" ||
    floorValue === "A" ||
    floorValue === "A1" ||
    floorValue === "F1" ||
    floorValue === "FLOOR 1" ||
    floorValue === "FLOOR A" ||
    floorValue === "FLOOR A1" ||
    rawFloorValue === "1" ||
    rawFloorValue === "A" ||
    rawFloorValue === "A1" ||
    rawFloorValue === "F1" ||
    rawFloorValue === "FLOOR 1" ||
    rawFloorValue === "FLOOR A" ||
    rawFloorValue === "FLOOR A1" ||
    slotCodeValue.startsWith("1-") ||
    slotCodeValue.startsWith("A-") ||
    slotCodeValue.startsWith("A1-") ||
    slotCodeValue.startsWith("F1-")
  ) {
    return "A";
  }

  if (
    floorValue === "2" ||
    floorValue === "C" ||
    floorValue === "A2" ||
    floorValue === "F2" ||
    floorValue === "FLOOR 2" ||
    floorValue === "FLOOR C" ||
    floorValue === "FLOOR A2" ||
    rawFloorValue === "2" ||
    rawFloorValue === "C" ||
    rawFloorValue === "A2" ||
    rawFloorValue === "F2" ||
    rawFloorValue === "FLOOR 2" ||
    rawFloorValue === "FLOOR C" ||
    rawFloorValue === "FLOOR A2" ||
    slotCodeValue.startsWith("2-") ||
    slotCodeValue.startsWith("C-") ||
    slotCodeValue.startsWith("A2-") ||
    slotCodeValue.startsWith("F2-")
  ) {
    return "C";
  }

  const firstLetterMatch = floorValue.match(/[A-Z]/);
  if (firstLetterMatch) {
    return firstLetterMatch[0];
  }

  return "S";
};

const getDisplaySlotCode = (slot) => {
  const rawSlotCode = String(slot?.slotCode || slot?.id || "").trim();
  const rawSlotId = String(slot?.id || "").trim();

  const numberMatch =
    rawSlotCode.match(/(\d+)$/) ||
    rawSlotId.match(/(\d+)$/);

  const numberPart = numberMatch ? numberMatch[1].padStart(2, "0") : "00";
  const floorPrefix = getFloorDisplayPrefix(slot);

  return `${floorPrefix}-${numberPart}`;
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

const mapApiSlotToViewSlot = (slot) => {
  const finalStatus = normalizeStatus(slot.status);

  return {
    id: slot.id,
    slotCode: getSlotCode(slot),
    floor: getFloorCode(slot),
    floorId: getFloorId(slot),
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

const getCurrentRole = () => {
  try {
    const savedUser = localStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : {};

    return parsedUser.role || parsedUser.roleName || "";
  } catch (error) {
    return "";
  }
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
  const [selectedModalVehicleTypeId, setSelectedModalVehicleTypeId] = useState("");
  const [slotQuantity, setSlotQuantity] = useState(1);
  const [slotModalLoading, setSlotModalLoading] = useState(false);
  const [slotModalError, setSlotModalError] = useState("");
  const [slotModalSuccess, setSlotModalSuccess] = useState("");

  const currentRole = getCurrentRole();
  const normalizedRole = String(currentRole || "").toUpperCase();

  const canManageSlots = [
    "SYSTEM_ADMIN",
    "PARKING_MANAGER",
    "PARKING_STAFF"
  ].includes(normalizedRole);

  useEffect(() => {
    selectedFloorRef.current = selectedFloor;
  }, [selectedFloor]);

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
        : payload.content ||
          payload.data ||
          payload.slots ||
          [];

      const mappedSlots = slots
        .map(mapApiSlotToViewSlot)
        .filter((slot) => {
          const allowedType = getAllowedTypeByFloor(slot.floor);

          if (slot.floor === "Unknown") {
            return true;
          }

          return slot.type === allowedType;
        });

      setSlotsData(mappedSlots);
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
          rawName: slot.floor,
          type: getAllowedTypeByFloor(slot.floor)
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
      if (!slot.floorId) {
        return;
      }

      if (!floorMap.has(slot.floorId)) {
        floorMap.set(slot.floorId, {
          id: slot.floorId,
          name: getDisplayFloorName(slot.floor),
          rawName: slot.floor,
          allowedType: getAllowedTypeByFloor(slot.floor)
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
      if (!slot.vehicleTypeId) {
        return;
      }

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
    if (floors.length === 0) {
      return;
    }

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
    const typeLabel =
      floor.type === "motorbike"
        ? "Motorbike"
        : floor.type === "car"
          ? "Car"
          : "Unknown";

    return `${floor.name} (${typeLabel})`;
  };

  const getStatusCountForCurrentFloor = (status) => {
    if (status === "all") {
      return floorSlots.length;
    }

    return floorSlots.filter((slot) => slot.status === status).length;
  };

  const openSlotModal = () => {
    setSlotAction("ADD");
    setSlotModalError("");
    setSlotModalSuccess("");
    setSlotQuantity(1);

    const currentFloor = floors.find((floor) => floor.id === selectedFloor);
    const defaultFloorId = currentFloor?.floorId || modalFloorOptions[0]?.id || "";
    const defaultAllowedType =
      currentFloor?.type || modalFloorOptions[0]?.allowedType || "car";

    const defaultVehicleType =
      modalVehicleTypeOptions.find((item) => item.normalizedType === defaultAllowedType) ||
      modalVehicleTypeOptions[0];

    setSelectedModalFloorId(defaultFloorId ? String(defaultFloorId) : "");
    setSelectedModalVehicleTypeId(defaultVehicleType?.id ? String(defaultVehicleType.id) : "");
    setIsSlotModalOpen(true);
  };

  const validateModalSelection = () => {
    const selectedFloorOption = modalFloorOptions.find(
      (floor) => String(floor.id) === String(selectedModalFloorId)
    );

    const selectedVehicleTypeOption = modalVehicleTypeOptions.find(
      (vehicleType) => String(vehicleType.id) === String(selectedModalVehicleTypeId)
    );

    if (!selectedFloorOption || !selectedVehicleTypeOption) {
      return "Please select floor and vehicle type.";
    }

    if (Number(slotQuantity) <= 0) {
      return "Quantity must be greater than 0.";
    }

    if (Number(slotQuantity) > 500) {
      return "Quantity cannot be greater than 500.";
    }

    if (selectedFloorOption.allowedType !== selectedVehicleTypeOption.normalizedType) {
      if (selectedFloorOption.allowedType === "motorbike") {
        return "Floor G is only for motorbike slots.";
      }

      return "This floor is only for car slots.";
    }

    return "";
  };

  const handleSubmitSlotManagement = async () => {
    try {
      setSlotModalLoading(true);
      setSlotModalError("");
      setSlotModalSuccess("");

      const validationMessage = validateModalSelection();

      if (validationMessage) {
        setSlotModalError(validationMessage);
        return;
      }

      const payload = {
        floorId: Number(selectedModalFloorId),
        vehicleTypeId: Number(selectedModalVehicleTypeId),
        quantity: Number(slotQuantity)
      };

      let response;

      if (slotAction === "ADD") {
        response = await axiosClient.post("/parking-slots/bulk-create", payload);
      } else {
        response = await axiosClient.delete("/parking-slots/bulk-delete", {
          data: payload
        });
      }

      setSlotModalSuccess(
        response.data?.message || "Parking slots updated successfully."
      );

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
          "Failed to update parking slots."
      );
    } finally {
      setSlotModalLoading(false);
    }
  };

  const openIncidentModal = (slot) => {
    if (!canManageSlots) {
      return;
    }

    setEditingSlot(slot);
    setManualLicensePlate("");
    setSlotStatusError("");
  };

  const closeIncidentModal = () => {
    if (slotStatusLoading) {
      return;
    }

    setEditingSlot(null);
    setManualLicensePlate("");
    setSlotStatusError("");
  };

  const getUpdatedInfoByStatus = (statusType) => {
    if (statusType === "occupied") {
      return manualLicensePlate.trim() || "Occupied";
    }

    if (statusType === "available") {
      return "Available";
    }

    if (statusType === "reserved") {
      return "Reserved";
    }

    if (statusType === "maintenance") {
      return "Maintenance";
    }

    return "Available";
  };

  const handleUpdateSlotStatus = async (statusType) => {
    if (!editingSlot) {
      return;
    }

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
      let statusIcon = (
        <span style={{ fontSize: "1.35rem", color: "#334155", fontWeight: "bold" }}>
          P
        </span>
      );
      let statusColor = "#10b981";

      if (slot.status === "occupied") {
        statusIcon = <Car size={26} />;
        statusColor = "#ef4444";
      } else if (slot.status === "reserved") {
        statusIcon = <Clock size={26} />;
        statusColor = "#f59e0b";
      } else if (slot.status === "maintenance") {
        statusIcon = <Wrench size={26} />;
        statusColor = "#64748b";
      }

      return (
        <div
          key={`${slot.id}-${slot.slotCode}`}
          onClick={() => openIncidentModal(slot)}
          title={canManageSlots ? "Click to configure this slot" : ""}
          style={{
            background: "#0c1322",
            border: `1px solid ${statusColor}`,
            padding: "1rem",
            borderRadius: "0.75rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: "124px",
            cursor: canManageSlots ? "pointer" : "default"
          }}
        >
          <div
            style={{
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
                  color: "#fff",
                  fontSize: "1rem",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {getDisplaySlotCode(slot)}
              </h4>

              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#cbd5e1",
                  fontWeight: "600"
                }}
              >
                {getDisplayVehicleType(slot.type)}
              </span>
            </div>

            <span
              style={{
                fontSize: "0.62rem",
                color: statusColor,
                fontWeight: "bold",
                textTransform: "uppercase",
                whiteSpace: "nowrap"
              }}
            >
              {slot.status}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: statusColor,
              paddingTop: "0.2rem"
            }}
          >
            {statusIcon}
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "0.78rem",
              color: slot.status === "occupied" ? "#3b82f6" : "#64748b",
              fontWeight: "600",
              background: slot.status === "occupied" ? "#1e293b" : "transparent",
              padding: "2px 4px",
              borderRadius: "4px"
            }}
          >
            {slot.info}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      className="dashboard-layout"
      style={{
        display: "flex",
        background: "#060b13",
        minHeight: "100vh"
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          padding: "1.5rem",
          overflowY: "auto"
        }}
      >
        <Header />

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#fff", fontSize: "1.75rem", margin: "0" }}>
            Parking Floors & Slots
          </h1>

          <p style={{ color: "#64748b", margin: "0.5rem 0" }}>
            Live parking slot data from database.
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
            { label: "TOTAL SLOTS", val: stats.total, color: "#fff" },
            { label: "AVAILABLE", val: stats.available, color: "#10b981" },
            { label: "OCCUPIED", val: stats.occupied, color: "#ef4444" },
            { label: "RESERVED", val: stats.reserved, color: "#f59e0b" },
            { label: "MAINTENANCE", val: stats.maintenance, color: "#64748b" }
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "#0c1322",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid #1e293b",
                position: "relative",
                minHeight: "76px"
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
                    background: "#1d4ed8",
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
                  color: "#64748b",
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
                  color: item.color
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
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fecaca",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem"
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "#060b13",
            padding: "0.85rem 0 1rem 0",
            marginBottom: "1rem",
            borderBottom: "1px solid #1e293b",
            boxShadow: "0 -32px 0 #060b13, 0 14px 28px rgba(2, 6, 23, 0.9)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.85rem"
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => handleFloorChange(floor.id)}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #1e293b",
                    background: selectedFloor === floor.id ? "#3b82f6" : "#131c2e",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "0.2s"
                  }}
                >
                  {getFloorButtonName(floor)}
                </button>
              ))}

              {!loading && floors.length === 0 && (
                <span style={{ color: "#64748b" }}>
                  Không có dữ liệu floor/slot trong database.
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => loadParkingSlots()}
                disabled={loading}
                style={{
                  background: "#131c2e",
                  border: "1px solid #1e293b",
                  color: "#fff",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.375rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <RefreshCw size={15} />
                {loading ? "Loading" : "Refresh"}
              </button>

              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                style={{
                  background: "#131c2e",
                  border: "1px solid #1e293b",
                  color: "#fff",
                  padding: "0.4rem",
                  borderRadius: "0.375rem",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                style={{
                  background: "#131c2e",
                  border: "1px solid #1e293b",
                  color: "#fff",
                  padding: "0.4rem",
                  borderRadius: "0.375rem",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer"
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
                        ? "1px solid #3b82f6"
                        : "1px solid #1e293b",
                      background: isActive ? "rgba(59, 130, 246, 0.18)" : "#0c1322",
                      color: isActive ? "#bfdbfe" : "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: 700,
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
                color: "#64748b",
                fontSize: "0.82rem",
                fontWeight: 600
              }}
            >
              Showing {showingStart}-{showingEnd} of {filteredSlots.length} slots
            </span>
          </div>
        </div>

        <div
          style={{
            minHeight: "180px",
            transition: "none"
          }}
        >
          {loading && !hasLoadedOnce ? (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#0c1322",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                textAlign: "center"
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
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#0c1322",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                textAlign: "center"
              }}
            >
              No slots match the selected status filter.
            </div>
          )}
        </div>
      </main>

      {editingSlot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.78)",
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
              background: "#0c1322",
              border: "1px solid #1e293b",
              padding: "1.5rem",
              borderRadius: "0.85rem",
              color: "#ffffff",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)"
            }}
          >
            <h3
              style={{
                color: "#fff",
                margin: "0 0 1.25rem 0",
                fontSize: "1.2rem"
              }}
            >
              Incident Config: Slot {getDisplaySlotCode(editingSlot)}
            </h3>

            <div style={{ marginBottom: "1.35rem" }}>
              <label
                style={{
                  color: "#64748b",
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
                  border: "1px solid #1e293b",
                  background: "#131c2e",
                  color: "#fff",
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
              <button
                type="button"
                onClick={() => handleUpdateSlotStatus("occupied")}
                disabled={slotStatusLoading}
                style={{
                  padding: "0.75rem",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.45rem",
                  cursor: slotStatusLoading ? "not-allowed" : "pointer",
                  fontWeight: "700"
                }}
              >
                Occupied
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSlotStatus("available")}
                disabled={slotStatusLoading}
                style={{
                  padding: "0.75rem",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.45rem",
                  cursor: slotStatusLoading ? "not-allowed" : "pointer",
                  fontWeight: "700"
                }}
              >
                Available (Clear)
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSlotStatus("reserved")}
                disabled={slotStatusLoading}
                style={{
                  padding: "0.75rem",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.45rem",
                  cursor: slotStatusLoading ? "not-allowed" : "pointer",
                  fontWeight: "700"
                }}
              >
                Reserved
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSlotStatus("maintenance")}
                disabled={slotStatusLoading}
                style={{
                  padding: "0.75rem",
                  background: "#64748b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.45rem",
                  cursor: slotStatusLoading ? "not-allowed" : "pointer",
                  fontWeight: "700"
                }}
              >
                Maintenance
              </button>
            </div>

            {slotStatusError && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.55rem",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fecaca",
                  fontSize: "0.85rem"
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
                color: "#64748b",
                border: "1px solid #1e293b",
                borderRadius: "0.45rem",
                cursor: slotStatusLoading ? "not-allowed" : "pointer",
                fontWeight: "600"
              }}
            >
              {slotStatusLoading ? "Updating..." : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {isSlotModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.75)",
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
              maxWidth: "520px",
              background: "#0c1322",
              border: "1px solid #1e293b",
              borderRadius: "1rem",
              padding: "1.5rem",
              color: "#ffffff",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)"
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
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>
                  Manage parking slots
                </h3>
                <p style={{ margin: "0.35rem 0 0", color: "#64748b" }}>
                  Add or delete available slots safely.
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
                  border: "1px solid #1e293b",
                  background: "#131c2e",
                  color: "#fff",
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
                gridTemplateColumns: "1fr 1fr",
                background: "#060b13",
                padding: "0.25rem",
                borderRadius: "0.75rem",
                marginBottom: "1rem"
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSlotAction("ADD");
                  setSlotModalError("");
                  setSlotModalSuccess("");
                }}
                style={{
                  border: "none",
                  borderRadius: "0.6rem",
                  padding: "0.75rem",
                  background: slotAction === "ADD" ? "#2563eb" : "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Add slots
              </button>

              <button
                type="button"
                onClick={() => {
                  setSlotAction("DELETE");
                  setSlotModalError("");
                  setSlotModalSuccess("");
                }}
                style={{
                  border: "none",
                  borderRadius: "0.6rem",
                  padding: "0.75rem",
                  background: slotAction === "DELETE" ? "#dc2626" : "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Delete slots
              </button>
            </div>

            <div style={{ display: "grid", gap: "1rem" }}>
              <label style={{ display: "grid", gap: "0.45rem", color: "#cbd5e1" }}>
                Floor
                <select
                  value={selectedModalFloorId}
                  onChange={(event) => setSelectedModalFloorId(event.target.value)}
                  disabled={slotModalLoading}
                  style={{
                    height: "44px",
                    borderRadius: "0.65rem",
                    border: "1px solid #1e293b",
                    background: "#060b13",
                    color: "#ffffff",
                    padding: "0 0.75rem"
                  }}
                >
                  <option value="">Select floor</option>
                  {modalFloorOptions.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "0.45rem", color: "#cbd5e1" }}>
                Vehicle type
                <select
                  value={selectedModalVehicleTypeId}
                  onChange={(event) => setSelectedModalVehicleTypeId(event.target.value)}
                  disabled={slotModalLoading}
                  style={{
                    height: "44px",
                    borderRadius: "0.65rem",
                    border: "1px solid #1e293b",
                    background: "#060b13",
                    color: "#ffffff",
                    padding: "0 0.75rem"
                  }}
                >
                  <option value="">Select vehicle type</option>
                  {modalVehicleTypeOptions.map((vehicleType) => (
                    <option key={vehicleType.id} value={vehicleType.id}>
                      {vehicleType.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "0.45rem", color: "#cbd5e1" }}>
                Quantity
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={slotQuantity}
                  onChange={(event) => setSlotQuantity(event.target.value)}
                  disabled={slotModalLoading}
                  placeholder="Enter quantity"
                  style={{
                    height: "44px",
                    borderRadius: "0.65rem",
                    border: "1px solid #1e293b",
                    background: "#060b13",
                    color: "#ffffff",
                    padding: "0 0.75rem"
                  }}
                />
              </label>
            </div>

            {slotModalError && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.65rem",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fecaca",
                  fontSize: "0.85rem"
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
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#bbf7d0",
                  fontSize: "0.85rem"
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
                  border: "1px solid #1e293b",
                  background: "#131c2e",
                  color: "#cbd5e1",
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
                  background: slotAction === "DELETE" ? "#dc2626" : "#2563eb",
                  color: "#ffffff",
                  cursor: slotModalLoading ? "not-allowed" : "pointer",
                  fontWeight: 700
                }}
              >
                {slotModalLoading
                  ? "Processing..."
                  : slotAction === "ADD"
                    ? "Add slots"
                    : "Delete slots"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingManagement;
