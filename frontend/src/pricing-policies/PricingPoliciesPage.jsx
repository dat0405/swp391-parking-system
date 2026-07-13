import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import {
  Download,
  Ban,
  CheckCircle,
  Edit3,
  Layers,
  Car,
  DollarSign,
  X,
  RefreshCw,
  CalendarDays,
  Percent,
  Trash2,
} from "lucide-react";
import { pricingPolicyApi } from "../api/pricingPolicyApi";
import { holidayApi } from "../api/holidayApi";

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  border: "var(--border-color)",
  tableHeader: "var(--bg-table-header)",
  tableRow: "var(--bg-table-row)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  yellow: "var(--warning-yellow)",
  yellowSoft: "var(--warning-yellow-soft)",
  shadow: "var(--shadow-card)",
};

const emptyPolicyForm = {
  id: null,
  vehicleTypeId: "",
  vehicleTypeName: "",
  basePrice: "",
  pricePerHour: "",
  overtimeFee: "",
  overstayFee: "",
  status: "ACTIVE",
};

const emptyHolidayForm = {
  id: null,
  holidayName: "",
  holidayDate: "",
  surchargeType: "PERCENT",
  surchargeValue: "",
  isActive: true,
};

const getCurrentUserRole = () => {
  const savedUser = localStorage.getItem("user");

  if (!savedUser) {
    return "";
  }

  try {
    const parsedUser = JSON.parse(savedUser);
    return String(parsedUser?.role || parsedUser?.roleName || "").toUpperCase();
  } catch (error) {
    console.error("Cannot parse user role from localStorage:", error);
    return "";
  }
};

const canManagePricingByRole = (role) => {
  const cleanRole = String(role || "").toUpperCase();
  return cleanRole === "SYSTEM_ADMIN" || cleanRole === "PARKING_MANAGER";
};

function PricingPoliciesPage() {
  const userRole = getCurrentUserRole();
  const canManagePricing = canManagePricingByRole(userRole);
  const isReadOnlyPriceList = !canManagePricing;

  const [policies, setPolicies] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidaySaving, setHolidaySaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState(emptyPolicyForm);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayFormData, setHolidayFormData] = useState(emptyHolidayForm);

  const itemsPerPage = 5;
  const emptyRowCount = Math.max(itemsPerPage - policies.length, 0);
  const holidayEmptyRowCount = Math.max(itemsPerPage - holidays.length, 0);

  const formatVND = (value) => {
    const numberValue = Number(value || 0);
    return `${numberValue.toLocaleString("vi-VN")} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return "Never";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateOnly = (value) => {
    if (!value) return "N/A";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatSurcharge = (holiday) => {
    const value = Number(holiday?.surchargeValue || 0);

    if (String(holiday?.surchargeType || "").toUpperCase() === "FIXED") {
      return formatVND(value);
    }

    return `${value.toLocaleString("vi-VN")}%`;
  };

  const fetchPricingPolicies = async () => {
    try {
      setLoading(true);

      const response = await pricingPolicyApi.getPricingPolicies();
      const data = Array.isArray(response.data) ? response.data : [];

      setPolicies(data);
    } catch (error) {
      console.error("Load pricing policies failed:", error);
      alert(error.response?.data?.message || "Cannot load pricing policies.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      setHolidayLoading(true);

      const response = await holidayApi.getHolidays();
      const data = Array.isArray(response.data) ? response.data : [];

      setHolidays(
        data.sort((a, b) =>
          String(a.holidayDate || "").localeCompare(String(b.holidayDate || ""))
        )
      );
    } catch (error) {
      console.error("Load holiday rules failed:", error);
      alert(error.response?.data?.message || "Cannot load holiday surcharge rules.");
    } finally {
      setHolidayLoading(false);
    }
  };

  const refreshAll = async () => {
    if (canManagePricing) {
      await Promise.all([fetchPricingPolicies(), fetchHolidays()]);
      return;
    }

    await fetchPricingPolicies();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const activeRules = useMemo(
    () => policies.filter((policy) => policy.status === "ACTIVE").length,
    [policies]
  );

  const vehicleTypeCount = useMemo(() => {
    const ids = new Set(policies.map((policy) => policy.vehicleTypeId));
    return ids.size;
  }, [policies]);

  const avgHourlyFee = useMemo(() => {
    if (policies.length === 0) return 0;

    const total = policies.reduce(
      (sum, policy) => sum + Number(policy.pricePerHour || 0),
      0
    );

    return Math.round(total / policies.length);
  }, [policies]);

  const activeHolidayRules = useMemo(
    () => holidays.filter((holiday) => holiday.isActive).length,
    [holidays]
  );

  const visiblePricingPolicies = useMemo(() => {
    if (canManagePricing) {
      return policies;
    }

    return policies.filter(
      (policy) => String(policy.status || "ACTIVE").toUpperCase() === "ACTIVE"
    );
  }, [policies, canManagePricing]);

  const openCreateModal = () => {
    if (!canManagePricing) return;

    setEditingPolicy(null);
    setFormData(emptyPolicyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (policy) => {
    if (!canManagePricing) return;

    setEditingPolicy(policy);

    setFormData({
      id: policy.id,
      vehicleTypeId: policy.vehicleTypeId || "",
      vehicleTypeName: policy.vehicleTypeName || "",
      basePrice: policy.basePrice ?? "",
      pricePerHour: policy.pricePerHour ?? "",
      overtimeFee: policy.overtimeFee ?? 0,
      overstayFee: policy.overstayFee ?? 0,
      status: policy.status || "ACTIVE",
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPolicy(null);
    setFormData(emptyPolicyForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildRequestPayload = () => ({
    vehicleTypeId: Number(formData.vehicleTypeId),
    basePrice: Number(formData.basePrice),
    pricePerHour: Number(formData.pricePerHour),
    overtimeFee: Number(formData.overtimeFee || 0),
    overstayFee: Number(formData.overstayFee || 0),
    status: formData.status || "ACTIVE",
  });

  const validateForm = () => {
    if (!formData.vehicleTypeId) {
      alert("Vehicle type ID is required.");
      return false;
    }

    if (formData.basePrice === "" || Number(formData.basePrice) < 0) {
      alert("Base price is required and cannot be negative.");
      return false;
    }

    if (formData.pricePerHour === "" || Number(formData.pricePerHour) < 0) {
      alert("Price per hour is required and cannot be negative.");
      return false;
    }

    if (formData.overtimeFee !== "" && Number(formData.overtimeFee) < 0) {
      alert("Overtime fee cannot be negative.");
      return false;
    }

    if (formData.overstayFee !== "" && Number(formData.overstayFee) < 0) {
      alert("Overstay fee cannot be negative.");
      return false;
    }

    return true;
  };

  const handleSubmitPolicy = async (event) => {
    event.preventDefault();

    if (!canManagePricing) return;
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildRequestPayload();

      if (editingPolicy) {
        await pricingPolicyApi.updatePricingPolicy(editingPolicy.id, payload);
      } else {
        await pricingPolicyApi.createPricingPolicy(payload);
      }

      await fetchPricingPolicies();
      closeModal();
    } catch (error) {
      console.error("Save pricing policy failed:", error);
      alert(error.response?.data?.message || "Cannot save pricing policy.");
    } finally {
      setSaving(false);
    }
  };

  const togglePolicyStatus = async (policy) => {
    if (!canManagePricing) return;

    const nextStatus = policy.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmMessage =
      nextStatus === "ACTIVE"
        ? `Enable pricing policy for ${policy.vehicleTypeName}?`
        : `Disable pricing policy for ${policy.vehicleTypeName}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await pricingPolicyApi.updatePricingPolicyStatus(policy.id, nextStatus);
      await fetchPricingPolicies();
    } catch (error) {
      console.error("Update pricing policy status failed:", error);
      alert(
        error.response?.data?.message ||
          "Cannot update pricing policy status."
      );
    }
  };

  const openCreateHolidayModal = () => {
    if (!canManagePricing) return;

    setEditingHoliday(null);
    setHolidayFormData(emptyHolidayForm);
    setIsHolidayModalOpen(true);
  };

  const openEditHolidayModal = (holiday) => {
    if (!canManagePricing) return;

    setEditingHoliday(holiday);
    setHolidayFormData({
      id: holiday.id,
      holidayName: holiday.holidayName || "",
      holidayDate: String(holiday.holidayDate || "").slice(0, 10),
      surchargeType: holiday.surchargeType || "PERCENT",
      surchargeValue: holiday.surchargeValue ?? "",
      isActive: holiday.isActive !== false,
    });
    setIsHolidayModalOpen(true);
  };

  const closeHolidayModal = () => {
    setIsHolidayModalOpen(false);
    setEditingHoliday(null);
    setHolidayFormData(emptyHolidayForm);
  };

  const handleHolidayFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setHolidayFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateHolidayForm = () => {
    if (!holidayFormData.holidayName.trim()) {
      alert("Holiday name is required.");
      return false;
    }

    if (!holidayFormData.holidayDate) {
      alert("Holiday date is required.");
      return false;
    }

    if (!holidayFormData.surchargeType) {
      alert("Surcharge type is required.");
      return false;
    }

    if (
      !["PERCENT", "FIXED"].includes(
        String(holidayFormData.surchargeType || "").toUpperCase()
      )
    ) {
      alert("Surcharge type must be PERCENT or FIXED.");
      return false;
    }

    if (
      holidayFormData.surchargeValue === "" ||
      Number(holidayFormData.surchargeValue) < 0
    ) {
      alert("Surcharge value is required and cannot be negative.");
      return false;
    }

    if (
      String(holidayFormData.surchargeType).toUpperCase() === "PERCENT" &&
      Number(holidayFormData.surchargeValue) > 100
    ) {
      alert("Percent surcharge cannot be greater than 100.");
      return false;
    }

    return true;
  };

  const buildHolidayPayload = () => ({
    holidayName: holidayFormData.holidayName.trim(),
    holidayDate: holidayFormData.holidayDate,
    surchargeType: String(holidayFormData.surchargeType || "PERCENT").toUpperCase(),
    surchargeValue: Number(holidayFormData.surchargeValue || 0),
    isActive: Boolean(holidayFormData.isActive),
  });

  const handleSubmitHoliday = async (event) => {
    event.preventDefault();

    if (!canManagePricing) return;
    if (!validateHolidayForm()) return;

    try {
      setHolidaySaving(true);

      const payload = buildHolidayPayload();

      if (editingHoliday) {
        await holidayApi.updateHoliday(editingHoliday.id, payload);
      } else {
        await holidayApi.createHoliday(payload);
      }

      await fetchHolidays();
      closeHolidayModal();
    } catch (error) {
      console.error("Save holiday rule failed:", error);
      alert(error.response?.data?.message || "Cannot save holiday rule.");
    } finally {
      setHolidaySaving(false);
    }
  };

  const toggleHolidayStatus = async (holiday) => {
    if (!canManagePricing) return;

    const nextIsActive = !holiday.isActive;

    const confirmMessage = nextIsActive
      ? `Enable holiday surcharge for ${holiday.holidayName}?`
      : `Disable holiday surcharge for ${holiday.holidayName}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await holidayApi.updateHolidayStatus(holiday.id, nextIsActive);
      await fetchHolidays();
    } catch (error) {
      console.error("Update holiday status failed:", error);
      alert(error.response?.data?.message || "Cannot update holiday status.");
    }
  };

  const deleteHoliday = async (holiday) => {
    if (!canManagePricing) return;

    if (!window.confirm(`Delete holiday rule "${holiday.holidayName}"?`)) {
      return;
    }

    try {
      await holidayApi.deleteHoliday(holiday.id);
      await fetchHolidays();
    } catch (error) {
      console.error("Delete holiday rule failed:", error);
      alert(error.response?.data?.message || "Cannot delete holiday rule.");
    }
  };

  const handleExportPricingCSV = () => {
    const headers = [
      "Policy ID",
      "Vehicle Type ID",
      "Vehicle Type",
      "Base Price",
      "Price Per Hour",
      "Overtime Fee",
      "Overstay Fee",
      "Status",
      "Created At",
      "Updated At",
    ];

    const rows = policies.map((policy) => [
      policy.id,
      policy.vehicleTypeId,
      policy.vehicleTypeName,
      policy.basePrice,
      policy.pricePerHour,
      policy.overtimeFee,
      policy.overstayFee,
      policy.status,
      policy.createdAt || "",
      policy.updatedAt || "",
    ]);

    downloadCSV(headers, rows, "pricing_policies");
  };

  const handleExportHolidayCSV = () => {
    const headers = [
      "Holiday ID",
      "Holiday Name",
      "Holiday Date",
      "Surcharge Type",
      "Surcharge Value",
      "Active",
    ];

    const rows = holidays.map((holiday) => [
      holiday.id,
      holiday.holidayName,
      holiday.holidayDate,
      holiday.surchargeType,
      holiday.surchargeValue,
      holiday.isActive ? "ACTIVE" : "INACTIVE",
    ]);

    downloadCSV(headers, rows, "holiday_surcharge_rules");
  };

  const downloadCSV = (headers, rows, filePrefix) => {
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      className="dashboard-layout"
      style={{
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: theme.page,
        color: theme.text,
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          minHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "2rem",
          boxSizing: "border-box",
          paddingBottom: "5rem",
          backgroundColor: theme.page,
          color: theme.text,
        }}
      >
        <Header />

        <div style={{ marginBottom: "2rem" }}>
          <div className="dashboard-title">
            <h1
              style={{
                color: theme.text,
                margin: 0,
                fontSize: "1.85rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              {canManagePricing ? "Pricing Policies" : "Price List"}
            </h1>

            <p
              style={{
                color: theme.muted,
                margin: "0.35rem 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              {canManagePricing
                ? "Configure standard parking fees, overtime fees, and holiday surcharge rules."
                : "View standard parking fees by vehicle type."}
            </p>
          </div>
        </div>

        {canManagePricing && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <StatBox
            label="Active Rules"
            value={String(activeRules).padStart(2, "0")}
            sub="Live pricing policies"
            color={theme.blue}
            icon={<Layers size={20} />}
          />

          <StatBox
            label="Vehicle Types"
            value={String(vehicleTypeCount).padStart(2, "0")}
            sub="Types with pricing data"
            color="#a855f7"
            icon={<Car size={20} />}
          />

          <StatBox
            label="Avg Hourly Fee"
            value={formatVND(avgHourlyFee)}
            sub="Average price per hour"
            color={theme.green}
            icon={<DollarSign size={20} />}
          />

          <StatBox
            label="Holiday Rules"
            value={String(activeHolidayRules).padStart(2, "0")}
            sub="Active holiday surcharges"
            color={theme.yellow}
            icon={<CalendarDays size={20} />}
          />
        </div>
        )}

        <PricingTableSection
          loading={loading}
          policies={visiblePricingPolicies}
          emptyRowCount={canManagePricing ? emptyRowCount : 0}
          formatVND={formatVND}
          formatDateTime={formatDateTime}
          fetchPricingPolicies={fetchPricingPolicies}
          handleExportPricingCSV={handleExportPricingCSV}
          openCreateModal={openCreateModal}
          openEditModal={openEditModal}
          togglePolicyStatus={togglePolicyStatus}
          canManagePricing={canManagePricing}
        />

        {canManagePricing && (
          <HolidayTableSection
            loading={holidayLoading}
            holidays={holidays}
            emptyRowCount={holidayEmptyRowCount}
            formatDateOnly={formatDateOnly}
            formatSurcharge={formatSurcharge}
            fetchHolidays={fetchHolidays}
            handleExportHolidayCSV={handleExportHolidayCSV}
            openCreateHolidayModal={openCreateHolidayModal}
            openEditHolidayModal={openEditHolidayModal}
            toggleHolidayStatus={toggleHolidayStatus}
            deleteHoliday={deleteHoliday}
          />
        )}

        {canManagePricing && (
        <div
          style={{
            backgroundColor: theme.blueSoft,
            border: `1px solid ${theme.border}`,
            padding: "0.9rem 1rem",
            borderRadius: "0.65rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: theme.shadow,
          }}
        >
          <span style={{ color: theme.blue, fontSize: "1rem" }}>ⓘ</span>

          <p
            style={{
              color: theme.muted,
              fontSize: "0.85rem",
              margin: 0,
              lineHeight: "1.4",
            }}
          >
            Check-out uses price per hour and overtime fee from pricing policies,
            then applies active holiday surcharge rules from the holiday table.
          </p>
        </div>
        )}
      </main>

      {canManagePricing && isModalOpen && (
        <PricingPolicyModal
          editingPolicy={editingPolicy}
          formData={formData}
          saving={saving}
          handleFormChange={handleFormChange}
          closeModal={closeModal}
          handleSubmitPolicy={handleSubmitPolicy}
        />
      )}

      {canManagePricing && isHolidayModalOpen && (
        <HolidayRuleModal
          editingHoliday={editingHoliday}
          holidayFormData={holidayFormData}
          holidaySaving={holidaySaving}
          handleHolidayFormChange={handleHolidayFormChange}
          closeHolidayModal={closeHolidayModal}
          handleSubmitHoliday={handleSubmitHoliday}
        />
      )}
    </div>
  );
}

function PricingTableSection({
  loading,
  policies,
  emptyRowCount,
  formatVND,
  formatDateTime,
  fetchPricingPolicies,
  handleExportPricingCSV,
  openCreateModal,
  openEditModal,
  togglePolicyStatus,
  canManagePricing,
}) {
  const colSpan = canManagePricing ? 9 : 6;

  return (
    <div style={{ ...tableCardStyle, minHeight: canManagePricing ? "520px" : "360px" }}>
      <div style={tableHeaderBarStyle}>
        <h3 style={sectionTitleStyle}>Standard pricing rules</h3>

        {canManagePricing && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={fetchPricingPolicies}
              disabled={loading}
              style={{
                ...secondaryButtonStyle,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            <button onClick={handleExportPricingCSV} style={secondaryButtonStyle}>
              <Download size={14} />
              Export CSV
            </button>

            <button onClick={openCreateModal} style={primaryButtonStyle}>
              + Add policy
            </button>
          </div>
        )}
      </div>

      <div style={tableScrollAreaStyle}>
        <table
          style={{
            ...mainTableStyle,
            minWidth: canManagePricing ? "1180px" : "940px",
          }}
        >
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>POLICY ID</th>
              <th style={thStyle}>VEHICLE TYPE</th>
              <th style={thStyle}>BASE PRICE</th>
              <th style={thStyle}>PRICE PER HOUR</th>
              <th style={thStyle}>OVERTIME FEE</th>
              <th style={thStyle}>OVERSTAY FEE</th>
              {canManagePricing && <th style={thStyle}>UPDATED AT</th>}
              {canManagePricing && <th style={thStyle}>STATUS</th>}
              {canManagePricing && <th style={{ ...thStyle, textAlign: "right" }}>ACTIONS</th>}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={colSpan} message="Loading pricing policies..." />
            ) : policies.length === 0 ? (
              <EmptyTableRow
                colSpan={colSpan}
                message={canManagePricing ? "No pricing policies found." : "No active price list found."}
              />
            ) : (
              <>
                {policies.map((policy) => (
                  <tr
                    key={policy.id}
                    style={{
                      borderBottom: `1px solid ${theme.border}`,
                      opacity: canManagePricing && policy.status === "INACTIVE" ? 0.58 : 1,
                      transition: "background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                      height: "76px",
                      background: theme.tableRow,
                      color: theme.text,
                    }}
                  >
                    <td style={idCellStyle}>PR-{String(policy.id).padStart(4, "0")}</td>

                    <td style={{ padding: "1.1rem", minWidth: "180px" }}>
                      <div style={entityTitleStyle}>
                        <Car size={15} style={{ color: theme.muted }} />
                        {policy.vehicleTypeName || "-"}
                      </div>

                      <div style={subTextStyle}>Type ID: {policy.vehicleTypeId}</div>
                    </td>

                    <td style={tdMoneyStyle}>{formatVND(policy.basePrice)}</td>
                    <td style={tdMoneyStyle}>{formatVND(policy.pricePerHour)}</td>
                    <td style={tdMoneyStyle}>{formatVND(policy.overtimeFee)}</td>
                    <td style={tdMoneyStyle}>{formatVND(policy.overstayFee)}</td>

                    {canManagePricing && (
                      <td style={dateCellStyle}>
                        {formatDateTime(policy.updatedAt || policy.createdAt)}
                      </td>
                    )}

                    {canManagePricing && (
                      <td style={{ padding: "1.1rem" }}>
                        <StatusBadge status={policy.status} />
                      </td>
                    )}

                    {canManagePricing && (
                      <td style={actionCellStyle}>
                        <div style={actionGroupStyle}>
                          <button
                            type="button"
                            onClick={() => openEditModal(policy)}
                            style={{
                              ...iconButtonStyle,
                              color: theme.blue,
                            }}
                            title="Edit pricing policy"
                          >
                            <Edit3 size={16} />
                          </button>

                          {policy.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => togglePolicyStatus(policy)}
                              style={{
                                ...iconButtonStyle,
                                color: theme.yellow,
                              }}
                              title="Disable policy"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePolicyStatus(policy)}
                              style={{
                                ...iconButtonStyle,
                                color: theme.green,
                              }}
                              title="Enable policy"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {canManagePricing &&
                  Array.from({ length: emptyRowCount }).map((_, index) => (
                    <tr
                      key={`pricing-empty-row-${index}`}
                      style={{
                        height: "76px",
                        background: theme.tableRow,
                        borderBottom:
                          index === emptyRowCount - 1
                            ? "none"
                            : `1px solid ${theme.border}`,
                      }}
                    >
                      <td colSpan={colSpan} />
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {canManagePricing && <TableFooter count={policies.length} label="pricing policies" />}
    </div>
  );
}

function HolidayTableSection({
  loading,
  holidays,
  emptyRowCount,
  formatDateOnly,
  formatSurcharge,
  fetchHolidays,
  handleExportHolidayCSV,
  openCreateHolidayModal,
  openEditHolidayModal,
  toggleHolidayStatus,
  deleteHoliday,
}) {
  return (
    <div style={{ ...tableCardStyle, minHeight: "460px" }}>
      <div style={tableHeaderBarStyle}>
        <div>
          <h3 style={sectionTitleStyle}>Holiday surcharge rules</h3>
          <p style={{ color: theme.muted, fontSize: "0.82rem", margin: "0.35rem 0 0" }}>
            Edit Christmas, Tet, Valentine, and other special-day surcharge values directly here.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={fetchHolidays}
            disabled={loading}
            style={{
              ...secondaryButtonStyle,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button onClick={handleExportHolidayCSV} style={secondaryButtonStyle}>
            <Download size={14} />
            Export CSV
          </button>

          <button onClick={openCreateHolidayModal} style={primaryButtonStyle}>
            + Add holiday
          </button>
        </div>
      </div>

      <div style={tableScrollAreaStyle}>
        <table style={mainTableStyle}>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>HOLIDAY ID</th>
              <th style={thStyle}>HOLIDAY NAME</th>
              <th style={thStyle}>DATE</th>
              <th style={thStyle}>SURCHARGE TYPE</th>
              <th style={thStyle}>SURCHARGE VALUE</th>
              <th style={thStyle}>STATUS</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={7} message="Loading holiday surcharge rules..." />
            ) : holidays.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No holiday surcharge rules found." />
            ) : (
              <>
                {holidays.map((holiday) => (
                  <tr
                    key={holiday.id}
                    style={{
                      borderBottom: `1px solid ${theme.border}`,
                      opacity: holiday.isActive === false ? 0.58 : 1,
                      transition: "background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                      height: "76px",
                      background: theme.tableRow,
                      color: theme.text,
                    }}
                  >
                    <td style={idCellStyle}>HD-{String(holiday.id).padStart(4, "0")}</td>

                    <td style={{ padding: "1.1rem", minWidth: "220px" }}>
                      <div style={entityTitleStyle}>
                        <CalendarDays size={15} style={{ color: theme.muted }} />
                        {holiday.holidayName || "-"}
                      </div>
                      <div style={subTextStyle}>Database ID: {holiday.id}</div>
                    </td>

                    <td style={dateCellStyle}>{formatDateOnly(holiday.holidayDate)}</td>

                    <td style={{ padding: "1.1rem", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          background: theme.cardSoft,
                          border: `1px solid ${theme.border}`,
                          borderRadius: "999px",
                          color: theme.text,
                          padding: "0.28rem 0.65rem",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                        }}
                      >
                        {holiday.surchargeType || "PERCENT"}
                      </span>
                    </td>

                    <td style={tdMoneyStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <Percent size={14} style={{ color: theme.muted }} />
                        {formatSurcharge(holiday)}
                      </span>
                    </td>

                    <td style={{ padding: "1.1rem" }}>
                      <StatusBadge status={holiday.isActive === false ? "INACTIVE" : "ACTIVE"} />
                    </td>

                    <td style={actionCellStyle}>
                      <div style={actionGroupStyle}>
                        <button
                          type="button"
                          onClick={() => openEditHolidayModal(holiday)}
                          style={{ ...iconButtonStyle, color: theme.blue }}
                          title="Edit holiday rule"
                        >
                          <Edit3 size={16} />
                        </button>

                        {holiday.isActive !== false ? (
                          <button
                            type="button"
                            onClick={() => toggleHolidayStatus(holiday)}
                            style={{ ...iconButtonStyle, color: theme.yellow }}
                            title="Disable holiday rule"
                          >
                            <Ban size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleHolidayStatus(holiday)}
                            style={{ ...iconButtonStyle, color: theme.green }}
                            title="Enable holiday rule"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteHoliday(holiday)}
                          style={{ ...iconButtonStyle, color: theme.red }}
                          title="Delete holiday rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {Array.from({ length: emptyRowCount }).map((_, index) => (
                  <tr
                    key={`holiday-empty-row-${index}`}
                    style={{
                      height: "76px",
                      background: theme.tableRow,
                      borderBottom:
                        index === emptyRowCount - 1
                          ? "none"
                          : `1px solid ${theme.border}`,
                    }}
                  >
                    <td colSpan="7" />
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <TableFooter count={holidays.length} label="holiday surcharge rules" />
    </div>
  );
}

function EmptyTableRow({ colSpan, message }) {
  return (
    <tr style={{ height: "300px", background: theme.tableRow }}>
      <td
        colSpan={colSpan}
        style={{
          padding: "2rem",
          textAlign: "center",
          color: theme.muted,
        }}
      >
        {message}
      </td>
    </tr>
  );
}

function TableFooter({ count, label }) {
  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderTop: `1px solid ${theme.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: theme.card,
        color: theme.muted,
        flexShrink: 0,
        position: "relative",
        zIndex: 2,
        pointerEvents: "none",
        userSelect: "none",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      <span style={{ fontSize: "0.85rem", pointerEvents: "none" }}>
        Showing{" "}
        <strong style={{ color: theme.text, fontWeight: "700" }}>
          {count}
        </strong>{" "}
        {label}
      </span>
    </div>
  );
}

function StatBox({ label, value, sub, color, icon }) {
  return (
    <div
      style={{
        backgroundColor: theme.card,
        padding: "1.25rem",
        borderRadius: "0.85rem",
        border: `1px solid ${theme.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        boxShadow: theme.shadow,
        minHeight: "120px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            color: theme.muted,
            fontSize: "0.75rem",
            fontWeight: "800",
          }}
        >
          {label}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <span
            style={{
              color: theme.text,
              fontSize: "2rem",
              fontWeight: "800",
              lineHeight: 1.05,
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </span>
        </div>

        <span
          style={{
            color: theme.muted,
            fontSize: "0.8rem",
            display: "block",
            marginTop: "0.3rem",
          }}
        >
          {sub}
        </span>
      </div>

      <div
        style={{
          backgroundColor: theme.cardSoft,
          padding: "0.65rem",
          borderRadius: "0.65rem",
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: `1px solid ${theme.border}`,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      style={{
        backgroundColor: isActive ? theme.greenSoft : theme.redSoft,
        color: isActive ? theme.green : theme.red,
        padding: "0.25rem 0.6rem",
        borderRadius: "0.35rem",
        fontSize: "0.72rem",
        fontWeight: "800",
        letterSpacing: "0.05em",
        border: `1px solid ${
          isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"
        }`,
      }}
    >
      {status}
    </span>
  );
}

function PricingPolicyModal({
  editingPolicy,
  formData,
  saving,
  handleFormChange,
  closeModal,
  handleSubmitPolicy,
}) {
  return (
    <ModalShell
      title={editingPolicy ? "Edit pricing policy" : "Add pricing policy"}
      onClose={closeModal}
      width="460px"
    >
      <form
        onSubmit={handleSubmitPolicy}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <ModalField label="Vehicle type ID *">
          <input
            type="number"
            name="vehicleTypeId"
            placeholder="1 = Car, 2 = Motorbike"
            value={formData.vehicleTypeId}
            onChange={handleFormChange}
            disabled={Boolean(editingPolicy)}
            required
            style={{
              ...modalInputStyle,
              opacity: editingPolicy ? 0.7 : 1,
              cursor: editingPolicy ? "not-allowed" : "text",
            }}
          />
        </ModalField>

        {formData.vehicleTypeName && (
          <div
            style={{
              color: theme.muted,
              fontSize: "0.8rem",
              marginTop: "-0.5rem",
            }}
          >
            Current type: {formData.vehicleTypeName}
          </div>
        )}

        <ModalField label="Base price *">
          <input
            type="number"
            name="basePrice"
            placeholder="e.g. 0"
            value={formData.basePrice}
            onChange={handleFormChange}
            required
            min="0"
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Price per hour *">
          <input
            type="number"
            name="pricePerHour"
            placeholder="e.g. 5000"
            value={formData.pricePerHour}
            onChange={handleFormChange}
            required
            min="0"
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Overtime fee">
          <input
            type="number"
            name="overtimeFee"
            placeholder="e.g. 0"
            value={formData.overtimeFee}
            onChange={handleFormChange}
            min="0"
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Overstay fee">
          <input
            type="number"
            name="overstayFee"
            placeholder="e.g. 1000"
            value={formData.overstayFee}
            onChange={handleFormChange}
            min="0"
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Status">
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            style={modalInputStyle}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </ModalField>

        <ModalActions
          saving={saving}
          closeModal={closeModal}
          saveLabel="Save policy"
          savingLabel="Saving..."
        />
      </form>
    </ModalShell>
  );
}

function HolidayRuleModal({
  editingHoliday,
  holidayFormData,
  holidaySaving,
  handleHolidayFormChange,
  closeHolidayModal,
  handleSubmitHoliday,
}) {
  return (
    <ModalShell
      title={editingHoliday ? "Edit holiday surcharge" : "Add holiday surcharge"}
      onClose={closeHolidayModal}
      width="500px"
    >
      <form
        onSubmit={handleSubmitHoliday}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <ModalField label="Holiday name *">
          <input
            type="text"
            name="holidayName"
            placeholder="e.g. Christmas Day"
            value={holidayFormData.holidayName}
            onChange={handleHolidayFormChange}
            required
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Holiday date *">
          <input
            type="date"
            name="holidayDate"
            value={holidayFormData.holidayDate}
            onChange={handleHolidayFormChange}
            required
            style={modalInputStyle}
          />
        </ModalField>

        <ModalField label="Surcharge type *">
          <select
            name="surchargeType"
            value={holidayFormData.surchargeType}
            onChange={handleHolidayFormChange}
            style={modalInputStyle}
          >
            <option value="PERCENT">PERCENT</option>
            <option value="FIXED">FIXED</option>
          </select>
        </ModalField>

        <ModalField
          label={
            holidayFormData.surchargeType === "FIXED"
              ? "Surcharge value (VND) *"
              : "Surcharge value (%) *"
          }
        >
          <input
            type="number"
            name="surchargeValue"
            placeholder={
              holidayFormData.surchargeType === "FIXED" ? "e.g. 10000" : "e.g. 10"
            }
            value={holidayFormData.surchargeValue}
            onChange={handleHolidayFormChange}
            min="0"
            max={holidayFormData.surchargeType === "PERCENT" ? "100" : undefined}
            required
            style={modalInputStyle}
          />
        </ModalField>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            color: theme.text,
            fontSize: "0.86rem",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            name="isActive"
            checked={Boolean(holidayFormData.isActive)}
            onChange={handleHolidayFormChange}
            style={{ width: 16, height: 16 }}
          />
          Active holiday surcharge
        </label>

        <ModalActions
          saving={holidaySaving}
          closeModal={closeHolidayModal}
          saveLabel="Save holiday"
          savingLabel="Saving..."
        />
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, width, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: theme.card,
          width,
          maxWidth: "100%",
          borderRadius: "0.85rem",
          border: `1px solid ${theme.border}`,
          padding: "1.5rem",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          color: theme.text,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h4
            style={{
              color: theme.text,
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: "700",
            }}
          >
            {title}
          </h4>

          <button type="button" onClick={onClose} style={iconButtonStyle}>
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalActions({ saving, closeModal, saveLabel, savingLabel }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        justifyContent: "flex-end",
        marginTop: "0.5rem",
      }}
    >
      <button
        type="button"
        onClick={closeModal}
        disabled={saving}
        style={{
          ...secondaryButtonStyle,
          opacity: saving ? 0.65 : 1,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        style={{
          ...primaryButtonStyle,
          opacity: saving ? 0.75 : 1,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        color: theme.muted,
        fontSize: "0.78rem",
        fontWeight: "700",
      }}
    >
      {label}
      {children}
    </label>
  );
}

const tableScrollAreaStyle = {
  width: "100%",
  overflowX: "auto",
  flex: 1,
  minHeight: 0,
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  scrollbarGutter: "stable",
  position: "relative",
  zIndex: 1,
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
};

const tableCardStyle = {
  backgroundColor: "var(--bg-card)",
  borderRadius: "0.85rem",
  border: "1px solid var(--border-color)",
  overflow: "hidden",
  marginBottom: "2rem",
  boxShadow: "var(--shadow-card)",
  minHeight: "520px",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  position: "relative",
  isolation: "isolate",
  contain: "paint",
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
};

const tableHeaderBarStyle = {
  padding: "1.25rem 1.5rem",
  borderBottom: "1px solid var(--border-color)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
  backgroundColor: "var(--bg-card)",
};

const sectionTitleStyle = {
  color: "var(--text-main)",
  fontSize: "1rem",
  fontWeight: "700",
  margin: 0,
};

const mainTableStyle = {
  width: "100%",
  minWidth: "1180px",
  height: "auto",
  borderCollapse: "collapse",
  fontSize: "0.85rem",
  textAlign: "left",
  color: "var(--text-main)",
};

const tableHeadRowStyle = {
  height: "62px",
  backgroundColor: "var(--bg-table-header)",
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border-color)",
};

const thStyle = {
  padding: "1rem 1.1rem",
  fontSize: "0.75rem",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const tdMoneyStyle = {
  padding: "1.1rem",
  color: "var(--text-main)",
  whiteSpace: "nowrap",
  fontWeight: "650",
};

const idCellStyle = {
  padding: "1.1rem 1.5rem",
  fontWeight: "700",
  color: "var(--text-main)",
  whiteSpace: "nowrap",
};

const entityTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "var(--text-main)",
  fontWeight: "700",
};

const subTextStyle = {
  color: "var(--text-muted)",
  fontSize: "0.72rem",
  marginTop: "0.2rem",
};

const dateCellStyle = {
  padding: "1.1rem",
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
};

const actionCellStyle = {
  padding: "1.1rem 1.5rem",
  textAlign: "right",
};

const actionGroupStyle = {
  display: "flex",
  gap: "0.85rem",
  justifyContent: "flex-end",
  alignItems: "center",
};

const iconButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.2s ease, opacity 0.2s ease, background-color 0.2s ease",
};

const primaryButtonStyle = {
  backgroundColor: "var(--primary-blue)",
  border: "none",
  color: "#ffffff",
  padding: "0.55rem 1rem",
  borderRadius: "0.55rem",
  fontSize: "0.85rem",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  color: "var(--text-main)",
  padding: "0.55rem 1rem",
  borderRadius: "0.55rem",
  fontSize: "0.85rem",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

const modalInputStyle = {
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: "0.55rem",
  padding: "0.65rem 0.8rem",
  color: "var(--text-main)",
  fontSize: "0.9rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default PricingPoliciesPage;
