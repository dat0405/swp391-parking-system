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
} from "lucide-react";
import { pricingPolicyApi } from "../api/pricingPolicyApi";

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

const emptyForm = {
  id: null,
  vehicleTypeId: "",
  vehicleTypeName: "",
  basePrice: "",
  pricePerHour: "",
  overtimeFee: "",
  status: "ACTIVE",
};

function PricingPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const itemsPerPage = 5;
  const emptyRowCount = Math.max(itemsPerPage - policies.length, 0);

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

  useEffect(() => {
    fetchPricingPolicies();
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

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);

    setFormData({
      id: policy.id,
      vehicleTypeId: policy.vehicleTypeId || "",
      vehicleTypeName: policy.vehicleTypeName || "",
      basePrice: policy.basePrice ?? "",
      pricePerHour: policy.pricePerHour ?? "",
      overtimeFee: policy.overtimeFee ?? 0,
      status: policy.status || "ACTIVE",
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPolicy(null);
    setFormData(emptyForm);
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

    return true;
  };

  const handleSubmitPolicy = async (event) => {
    event.preventDefault();

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

  const handleExportCSV = () => {
    const headers = [
      "Policy ID",
      "Vehicle Type ID",
      "Vehicle Type",
      "Base Price",
      "Price Per Hour",
      "Overtime Fee",
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
      policy.status,
      policy.createdAt || "",
      policy.updatedAt || "",
    ]);

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
    link.download = `pricing_policies_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
              Pricing Policies
            </h1>

            <p
              style={{
                color: theme.muted,
                margin: "0.35rem 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              Configure and manage pricing by vehicle type.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
        </div>

        <div
          style={{
            backgroundColor: theme.card,
            borderRadius: "0.85rem",
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            marginBottom: "2rem",
            boxShadow: theme.shadow,
            minHeight: "520px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              backgroundColor: theme.card,
            }}
          >
            <h3
              style={{
                color: theme.text,
                fontSize: "1rem",
                fontWeight: "700",
                margin: 0,
              }}
            >
              Standard pricing rules
            </h3>

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

              <button onClick={handleExportCSV} style={secondaryButtonStyle}>
                <Download size={14} />
                Export CSV
              </button>

              <button onClick={openCreateModal} style={primaryButtonStyle}>
                + Add policy
              </button>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              overflowX: "auto",
              flex: 1,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "1050px",
                height: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                textAlign: "left",
                color: theme.text,
              }}
            >
              <thead>
                <tr
                  style={{
                    height: "62px",
                    backgroundColor: theme.tableHeader,
                    color: theme.muted,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  <th style={thStyle}>POLICY ID</th>
                  <th style={thStyle}>VEHICLE TYPE</th>
                  <th style={thStyle}>BASE PRICE</th>
                  <th style={thStyle}>PRICE PER HOUR</th>
                  <th style={thStyle}>OVERTIME FEE</th>
                  <th style={thStyle}>UPDATED AT</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr style={{ height: "340px", background: theme.tableRow }}>
                    <td
                      colSpan="8"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: theme.muted,
                      }}
                    >
                      Loading pricing policies...
                    </td>
                  </tr>
                ) : policies.length === 0 ? (
                  <tr style={{ height: "340px", background: theme.tableRow }}>
                    <td
                      colSpan="8"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: theme.muted,
                      }}
                    >
                      No pricing policies found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {policies.map((policy) => (
                      <tr
                        key={policy.id}
                        style={{
                          borderBottom: `1px solid ${theme.border}`,
                          opacity: policy.status === "INACTIVE" ? 0.58 : 1,
                          transition: "all 0.2s ease",
                          height: "76px",
                          background: theme.tableRow,
                          color: theme.text,
                        }}
                      >
                        <td
                          style={{
                            padding: "1.1rem 1.5rem",
                            fontWeight: "700",
                            color: theme.text,
                            whiteSpace: "nowrap",
                          }}
                        >
                          PR-{String(policy.id).padStart(4, "0")}
                        </td>

                        <td style={{ padding: "1.1rem", minWidth: "180px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              color: theme.text,
                              fontWeight: "700",
                            }}
                          >
                            <Car size={15} style={{ color: theme.muted }} />
                            {policy.vehicleTypeName || "-"}
                          </div>

                          <div
                            style={{
                              color: theme.muted,
                              fontSize: "0.72rem",
                              marginTop: "0.2rem",
                            }}
                          >
                            Type ID: {policy.vehicleTypeId}
                          </div>
                        </td>

                        <td style={tdMoneyStyle}>
                          {formatVND(policy.basePrice)}
                        </td>

                        <td style={tdMoneyStyle}>
                          {formatVND(policy.pricePerHour)}
                        </td>

                        <td style={tdMoneyStyle}>
                          {formatVND(policy.overtimeFee)}
                        </td>

                        <td
                          style={{
                            padding: "1.1rem",
                            color: theme.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDateTime(policy.updatedAt || policy.createdAt)}
                        </td>

                        <td style={{ padding: "1.1rem" }}>
                          <StatusBadge status={policy.status} />
                        </td>

                        <td
                          style={{
                            padding: "1.1rem 1.5rem",
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "0.85rem",
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
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
                      </tr>
                    ))}

                    {Array.from({ length: emptyRowCount }).map((_, index) => (
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
                        <td colSpan="8" />
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

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
            }}
          >
            <span style={{ fontSize: "0.85rem" }}>
              Showing{" "}
              <strong style={{ color: theme.text, fontWeight: "700" }}>
                {policies.length}
              </strong>{" "}
              pricing policies
            </span>
          </div>
        </div>

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
            Pricing policies are used by the check-out module to calculate
            parking fees. Make sure each vehicle type has only one active
            policy.
          </p>
        </div>
      </main>

      {isModalOpen && (
        <PricingPolicyModal
          editingPolicy={editingPolicy}
          formData={formData}
          saving={saving}
          handleFormChange={handleFormChange}
          closeModal={closeModal}
          handleSubmitPolicy={handleSubmitPolicy}
        />
      )}
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
        border: `1px solid ${isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
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
          width: "460px",
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
            {editingPolicy ? "Edit pricing policy" : "Add pricing policy"}
          </h4>

          <button type="button" onClick={closeModal} style={iconButtonStyle}>
            <X size={18} />
          </button>
        </div>

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
              {saving ? "Saving..." : "Save policy"}
            </button>
          </div>
        </form>
      </div>
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

const iconButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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