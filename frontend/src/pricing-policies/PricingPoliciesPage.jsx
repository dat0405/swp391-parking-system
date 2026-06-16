import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';
import {
  Download,
  Ban,
  CheckCircle,
  Edit3,
  Layers,
  Car,
  DollarSign,
  X,
  RefreshCw
} from 'lucide-react';
import { pricingPolicyApi } from '../api/pricingPolicyApi';

// Thành phần  trợ hiển thị các ô thống kê (StatBox Component)
const StatBox = ({ label, value, sub, color }) => (
  <div
    style={{
      backgroundColor: '#1e293b',
      padding: '1.25rem',
      borderRadius: '0.75rem',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }}
  >
    <div>
      <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600' }}>
        {label}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
          marginTop: '0.5rem'
        }}
      >
        <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '700' }}>
          {value}
        </span>
      </div>

      <span
        style={{
          color: '#475569',
          fontSize: '0.75rem',
          display: 'block',
          marginTop: '0.25rem'
        }}
      >
        {sub}
      </span>
    </div>

    <div
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: '0.5rem',
        borderRadius: '0.5rem'
      }}
    >
      {label === 'Active Rules' && <Layers size={20} style={{ color }} />}
      {label === 'Vehicle Types' && <Car size={20} style={{ color }} />}
      {label === 'Avg Hourly Fee' && <DollarSign size={20} style={{ color }} />}
    </div>
  </div>
);

const emptyForm = {
  id: null,
  vehicleTypeId: '',
  vehicleTypeName: '',
  basePrice: '',
  pricePerHour: '',
  overtimeFee: '',
  status: 'ACTIVE'
};

function PricingPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const formatVND = (value) => {
    const numberValue = Number(value || 0);
    return `${numberValue.toLocaleString('vi-VN')} VND`;
  };

  const formatDateTime = (value) => {
    if (!value) return 'Never';

    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const fetchPricingPolicies = async () => {
    try {
      setLoading(true);

      const response = await pricingPolicyApi.getPricingPolicies();
      const data = Array.isArray(response.data) ? response.data : [];

      setPolicies(data);
    } catch (error) {
      console.error('Load pricing policies failed:', error);
      alert(error.response?.data?.message || 'Cannot load pricing policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingPolicies();
  }, []);

  const activeRules = useMemo(
    () => policies.filter((policy) => policy.status === 'ACTIVE').length,
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
      vehicleTypeId: policy.vehicleTypeId || '',
      vehicleTypeName: policy.vehicleTypeName || '',
      basePrice: policy.basePrice ?? '',
      pricePerHour: policy.pricePerHour ?? '',
      overtimeFee: policy.overtimeFee ?? 0,
      status: policy.status || 'ACTIVE'
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
      [name]: value
    }));
  };

  const buildRequestPayload = () => ({
    vehicleTypeId: Number(formData.vehicleTypeId),
    basePrice: Number(formData.basePrice),
    pricePerHour: Number(formData.pricePerHour),
    overtimeFee: Number(formData.overtimeFee || 0),
    status: formData.status || 'ACTIVE'
  });

  const validateForm = () => {
    if (!formData.vehicleTypeId) {
      alert('Vehicle type ID is required.');
      return false;
    }

    if (formData.basePrice === '' || Number(formData.basePrice) < 0) {
      alert('Base price is required and cannot be negative.');
      return false;
    }

    if (formData.pricePerHour === '' || Number(formData.pricePerHour) < 0) {
      alert('Price per hour is required and cannot be negative.');
      return false;
    }

    if (formData.overtimeFee !== '' && Number(formData.overtimeFee) < 0) {
      alert('Overtime fee cannot be negative.');
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
      console.error('Save pricing policy failed:', error);
      alert(error.response?.data?.message || 'Cannot save pricing policy.');
    } finally {
      setSaving(false);
    }
  };

  const togglePolicyStatus = async (policy) => {
    const nextStatus = policy.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const confirmMessage =
      nextStatus === 'ACTIVE'
        ? `Enable pricing policy for ${policy.vehicleTypeName}?`
        : `Disable pricing policy for ${policy.vehicleTypeName}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await pricingPolicyApi.updatePricingPolicyStatus(policy.id, nextStatus);
      await fetchPricingPolicies();
    } catch (error) {
      console.error('Update pricing policy status failed:', error);
      alert(error.response?.data?.message || 'Cannot update pricing policy status.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Policy ID',
      'Vehicle Type ID',
      'Vehicle Type',
      'Base Price',
      'Price Per Hour',
      'Overtime Fee',
      'Status',
      'Created At',
      'Updated At'
    ];

    const rows = policies.map((policy) => [
      policy.id,
      policy.vehicleTypeId,
      policy.vehicleTypeName,
      policy.basePrice,
      policy.pricePerHour,
      policy.overtimeFee,
      policy.status,
      policy.createdAt || '',
      policy.updatedAt || ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell ?? ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'pricing_policies_export.csv';
    link.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      className="dashboard-layout"
      style={{
        position: 'relative',
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#020617',
        overflow: 'hidden'
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '2rem',
          boxSizing: 'border-box',
          paddingBottom: '5rem'
        }}
      >
        <Header />

        <div style={{ marginBottom: '2rem' }}>
          <div className="dashboard-title">
            <h1>Pricing Policies</h1>
            <p>Configure and manage pricing by vehicle type.</p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <StatBox
            label="Active Rules"
            value={String(activeRules).padStart(2, '0')}
            sub="Live pricing policies"
            color="#3b82f6"
          />

          <StatBox
            label="Vehicle Types"
            value={String(vehicleTypeCount).padStart(2, '0')}
            sub="Types with pricing data"
            color="#a855f7"
          />

          <StatBox
            label="Avg Hourly Fee"
            value={formatVND(avgHourlyFee)}
            sub="Average price per hour"
            color="#22c55e"
          />
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.05)',
            overflow: 'visible',
            marginBottom: '2rem'
          }}
        >
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <h3
              style={{
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: '600',
                margin: 0
              }}
            >
              Standard pricing rules
            </h3>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={fetchPricingPolicies}
                disabled={loading}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>

              <button
                onClick={handleExportCSV}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                Export CSV
              </button>

              <button
                onClick={openCreateModal}
                style={{
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                + Add policy
              </button>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              overflowX: 'auto',
              overflowY: 'visible'
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '1050px',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}
            >
              <thead
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  color: '#64748b'
                }}
              >
                <tr>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    POLICY ID
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    VEHICLE TYPE
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    BASE PRICE
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    PRICE PER HOUR
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    OVERTIME FEE
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    UPDATED AT
                  </th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: '1rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textAlign: 'right'
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#94a3b8'
                      }}
                    >
                      Loading pricing policies...
                    </td>
                  </tr>
                ) : policies.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#94a3b8'
                      }}
                    >
                      No pricing policies found.
                    </td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <tr
                      key={policy.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        opacity: policy.status === 'INACTIVE' ? 0.55 : 1,
                        transition: 'all 0.2s ease',
                        height: '76px'
                      }}
                    >
                      <td
                        style={{
                          padding: '1.1rem 1.5rem',
                          fontWeight: '600',
                          color: '#cbd5e1',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        PR-{String(policy.id).padStart(4, '0')}
                      </td>

                      <td style={{ padding: '1.1rem', minWidth: '180px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#fff',
                            fontWeight: '500'
                          }}
                        >
                          <Car size={15} style={{ color: '#64748b' }} />
                          {policy.vehicleTypeName}
                        </div>

                        <div
                          style={{
                            color: '#64748b',
                            fontSize: '0.72rem',
                            marginTop: '0.2rem'
                          }}
                        >
                          Type ID: {policy.vehicleTypeId}
                        </div>
                      </td>

                      <td style={{ padding: '1.1rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {formatVND(policy.basePrice)}
                      </td>

                      <td style={{ padding: '1.1rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {formatVND(policy.pricePerHour)}
                      </td>

                      <td style={{ padding: '1.1rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {formatVND(policy.overtimeFee)}
                      </td>

                      <td style={{ padding: '1.1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDateTime(policy.updatedAt || policy.createdAt)}
                      </td>

                      <td style={{ padding: '1.1rem' }}>
                        <span
                          style={{
                            backgroundColor:
                              policy.status === 'ACTIVE'
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(239,68,68,0.1)',
                            color: policy.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {policy.status}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: '1.1rem 1.5rem',
                          textAlign: 'right'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.85rem',
                            justifyContent: 'flex-end',
                            alignItems: 'center'
                          }}
                        >
                          <Edit3
                            size={15}
                            onClick={() => openEditModal(policy)}
                            style={{ cursor: 'pointer', color: '#3b82f6' }}
                            title="Edit pricing policy"
                          />

                          {policy.status === 'ACTIVE' ? (
                            <Ban
                              size={15}
                              onClick={() => togglePolicyStatus(policy)}
                              style={{ cursor: 'pointer', color: '#f59e0b' }}
                              title="Disable policy"
                            />
                          ) : (
                            <CheckCircle
                              size={15}
                              onClick={() => togglePolicyStatus(policy)}
                              style={{ cursor: 'pointer', color: '#10b981' }}
                              title="Enable policy"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.15)'
            }}
          >
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Showing{' '}
              <strong style={{ color: '#fff', fontWeight: '600' }}>
                {policies.length}
              </strong>{' '}
              pricing policies
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.1)',
            padding: '0.9rem 1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ color: '#3b82f6', fontSize: '1rem' }}>ⓘ</span>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.8rem',
              margin: 0,
              lineHeight: '1.4'
            }}
          >
            Pricing policies are used by the check-out module to calculate parking fees.
            Make sure each vehicle type has only one active policy.
          </p>
        </div>
      </main>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              width: '460px',
              borderRadius: '0.75rem',
              border: '1px solid #334155',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <h4
                style={{
                  color: '#fff',
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: '600'
                }}
              >
                {editingPolicy ? 'Edit pricing policy' : 'Add pricing policy'}
              </h4>

              <X
                size={18}
                style={{ color: '#64748b', cursor: 'pointer' }}
                onClick={closeModal}
              />
            </div>

            <form
              onSubmit={handleSubmitPolicy}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>
                  Vehicle type ID *
                </label>

                <input
                  type="number"
                  name="vehicleTypeId"
                  placeholder="1 = Car, 2 = Motorbike"
                  value={formData.vehicleTypeId}
                  onChange={handleFormChange}
                  disabled={Boolean(editingPolicy)}
                  required
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    padding: '0.55rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    opacity: editingPolicy ? 0.7 : 1
                  }}
                />
              </div>

              {formData.vehicleTypeName && (
                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    marginTop: '-0.5rem'
                  }}
                >
                  Current type: {formData.vehicleTypeName}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>
                  Base price *
                </label>

                <input
                  type="number"
                  name="basePrice"
                  placeholder="e.g. 0"
                  value={formData.basePrice}
                  onChange={handleFormChange}
                  required
                  min="0"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    padding: '0.55rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>
                  Price per hour *
                </label>

                <input
                  type="number"
                  name="pricePerHour"
                  placeholder="e.g. 5000"
                  value={formData.pricePerHour}
                  onChange={handleFormChange}
                  required
                  min="0"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    padding: '0.55rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>
                  Overtime fee
                </label>

                <input
                  type="number"
                  name="overtimeFee"
                  placeholder="e.g. 0"
                  value={formData.overtimeFee}
                  onChange={handleFormChange}
                  min="0"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    padding: '0.55rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600' }}>
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.375rem',
                    padding: '0.55rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    padding: '0.45rem 1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#1e3a8a' : '#3b82f6',
                    border: 'none',
                    color: '#fff',
                    padding: '0.45rem 1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : 'Save policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingPoliciesPage;