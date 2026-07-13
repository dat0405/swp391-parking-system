import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bike,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Eye,
  Hash,
  History,
  LoaderCircle,
  MapPin,
  ReceiptText,
  RefreshCw,
  Search,
  Timer,
  User,
  X
} from 'lucide-react';

import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';
import { bookingHistoryApi } from '../api/bookingHistoryApi';
import './BookingHistoryPage.css';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

const ACTIVE_STATUSES = new Set([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN'
]);

const CANCELLED_STATUSES = new Set([
  'CANCELLED',
  'EXPIRED',
  'NO_SHOW',
  'REFUNDED'
]);

const normalizeStatus = (value) => {
  return String(value || '')
    .trim()
    .toUpperCase();
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  });
};

const formatMoney = (amount, currency = 'VND') => {
  const numericAmount = Number(amount || 0);

  if (String(currency || '').toUpperCase() === 'VND') {
    return `${numericAmount.toLocaleString('vi-VN')} VNĐ`;
  }

  return `${numericAmount.toLocaleString('vi-VN')} ${currency || ''}`.trim();
};

const formatDuration = (minutes) => {
  const totalMinutes = Number(minutes || 0);

  if (totalMinutes <= 0) {
    return 'N/A';
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
};

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);

  const labels = {
    PENDING_PAYMENT: 'Pending Payment',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    NO_SHOW: 'No Show',
    REFUNDED: 'Refunded'
  };

  return labels[normalized] || normalized || 'Unknown';
};

const getPaymentStatusLabel = (status) => {
  const normalized = normalizeStatus(status);

  const labels = {
    PENDING: 'Pending',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    FAILED: 'Failed'
  };

  return labels[normalized] || normalized || 'Unknown';
};

const getVehicleIcon = (vehicleTypeName) => {
  const type = String(vehicleTypeName || '').toLowerCase();

  if (
    type.includes('motor') ||
    type.includes('bike') ||
    type.includes('xe máy')
  ) {
    return <Bike size={18} />;
  }

  return <Car size={18} />;
};

const matchesFilter = (booking, filter) => {
  const status = normalizeStatus(booking?.status);

  if (filter === 'ACTIVE') {
    return ACTIVE_STATUSES.has(status);
  }

  if (filter === 'COMPLETED') {
    return status === 'COMPLETED';
  }

  if (filter === 'CANCELLED') {
    return CANCELLED_STATUSES.has(status);
  }

  return true;
};

function DetailItem({ icon, label, value }) {
  return (
    <div className="history-detail-item">
      <span className="history-detail-item-icon">
        {icon}
      </span>

      <div>
        <span>{label}</span>
        <strong>{value ?? 'N/A'}</strong>
      </div>
    </div>
  );
}

function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [detailModal, setDetailModal] = useState({
    show: false,
    loading: false,
    data: null,
    error: ''
  });

  const loadBookings = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const data = await bookingHistoryApi.getMyHistory();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load booking history:', error);

      setErrorMessage(
        error.response?.data?.message ||
          error.response?.data ||
          'Không thể tải lịch sử booking. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (!detailModal.show) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeDetail();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [detailModal.show]);

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return bookings.filter((booking) => {
      if (!matchesFilter(booking, filter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValue = [
        booking.bookingCode,
        booking.licensePlate,
        booking.slotCode,
        booking.floorName,
        booking.vehicleTypeName,
        booking.status,
        booking.paymentStatus
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableValue.includes(normalizedSearch);
    });
  }, [bookings, filter, searchTerm]);

  const statistics = useMemo(() => {
    const total = bookings.length;

    const active = bookings.filter((booking) =>
      ACTIVE_STATUSES.has(normalizeStatus(booking.status))
    ).length;

    const completed = bookings.filter(
      (booking) =>
        normalizeStatus(booking.status) === 'COMPLETED'
    ).length;

    const paidAmount = bookings.reduce((sum, booking) => {
      if (normalizeStatus(booking.paymentStatus) !== 'PAID') {
        return sum;
      }

      return sum + Number(booking.paymentAmount || 0);
    }, 0);

    return {
      total,
      active,
      completed,
      paidAmount
    };
  }, [bookings]);

  const openDetail = async (bookingId) => {
    setDetailModal({
      show: true,
      loading: true,
      data: null,
      error: ''
    });

    try {
      const detail =
        await bookingHistoryApi.getMyHistoryDetail(bookingId);

      setDetailModal({
        show: true,
        loading: false,
        data: detail,
        error: ''
      });
    } catch (error) {
      console.error('Failed to load booking detail:', error);

      setDetailModal({
        show: true,
        loading: false,
        data: null,
        error:
          error.response?.data?.message ||
          error.response?.data ||
          'Không thể tải chi tiết booking.'
      });
    }
  };

  const closeDetail = () => {
    setDetailModal({
      show: false,
      loading: false,
      data: null,
      error: ''
    });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="booking-history-page">
          <section className="booking-history-header">
            <div>
              <span className="booking-history-eyebrow">
                Personal reservations
              </span>

              <h1>Booking History</h1>

              <p>
                Review your parking reservations, payment
                information and booking details.
              </p>
            </div>

            <button
              type="button"
              className="booking-history-refresh"
              onClick={() => loadBookings({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? 'is-spinning' : ''}
              />

              <span>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </section>

          <section className="booking-history-stats">
            <article className="history-stat-card">
              <div className="history-stat-icon">
                <History size={20} />
              </div>

              <div>
                <span>Total bookings</span>
                <strong>{statistics.total}</strong>
              </div>
            </article>

            <article className="history-stat-card">
              <div className="history-stat-icon">
                <Clock size={20} />
              </div>

              <div>
                <span>Active</span>
                <strong>{statistics.active}</strong>
              </div>
            </article>

            <article className="history-stat-card">
              <div className="history-stat-icon">
                <CheckCircle2 size={20} />
              </div>

              <div>
                <span>Completed</span>
                <strong>{statistics.completed}</strong>
              </div>
            </article>

            <article className="history-stat-card">
              <div className="history-stat-icon">
                <CircleDollarSign size={20} />
              </div>

              <div>
                <span>Total paid</span>
                <strong>{formatMoney(statistics.paidAmount)}</strong>
              </div>
            </article>
          </section>

          <section className="booking-history-content">
            <div className="booking-history-toolbar">
              <div className="history-filter-group">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={
                      filter === item.key
                        ? 'history-filter active'
                        : 'history-filter'
                    }
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="history-search-box">
                <Search size={17} />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search booking, plate or slot..."
                />
              </label>
            </div>

            {errorMessage && (
              <div className="history-error-box">
                <AlertCircle size={20} />
                <span>{errorMessage}</span>

                <button
                  type="button"
                  onClick={() => loadBookings()}
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="history-loading-state">
                <LoaderCircle
                  size={30}
                  className="is-spinning"
                />
                <p>Loading booking history...</p>
              </div>
            ) : !errorMessage && filteredBookings.length === 0 ? (
              <div className="history-empty-state">
                <History size={42} />
                <h3>No booking found</h3>
                <p>
                  There is no booking matching the selected
                  filter or search value.
                </p>
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Vehicle</th>
                      <th>Parking</th>
                      <th>Reservation time</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBookings.map((booking) => {
                      const status = normalizeStatus(booking.status);
                      const paymentStatus = normalizeStatus(
                        booking.paymentStatus
                      );

                      return (
                        <tr key={booking.id}>
                          <td>
                            <div className="history-primary-cell">
                              <strong>
                                {booking.bookingCode || `BK-${booking.id}`}
                              </strong>
                              <span>
                                Created {formatDateTime(booking.bookingTime)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="history-vehicle-cell">
                              <span className="history-vehicle-icon">
                                {getVehicleIcon(booking.vehicleTypeName)}
                              </span>

                              <div>
                                <strong>
                                  {booking.licensePlate || 'N/A'}
                                </strong>
                                <span>
                                  {booking.vehicleTypeName || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="history-primary-cell">
                              <strong>{booking.slotCode || 'N/A'}</strong>
                              <span>{booking.floorName || 'N/A'}</span>
                            </div>
                          </td>

                          <td>
                            <div className="history-primary-cell">
                              <strong>
                                {formatDateTime(booking.startTime)}
                              </strong>
                              <span>
                                To {formatDateTime(booking.endTime)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`history-status history-status-${status.toLowerCase()}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </td>

                          <td>
                            <div className="history-payment-cell">
                              <span
                                className={`history-payment-status history-payment-${paymentStatus.toLowerCase()}`}
                              >
                                {getPaymentStatusLabel(paymentStatus)}
                              </span>

                              <strong>
                                {formatMoney(
                                  booking.paymentAmount,
                                  booking.paymentCurrency
                                )}
                              </strong>
                            </div>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="history-view-button"
                              onClick={() => openDetail(booking.id)}
                            >
                              <Eye size={16} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {detailModal.show && (
          <div
            className="history-modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDetail();
              }
            }}
          >
            <section
              className="history-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-history-modal-title"
            >
              <button
                type="button"
                className="history-modal-close"
                onClick={closeDetail}
                aria-label="Close booking detail"
              >
                <X size={20} />
              </button>

              {detailModal.loading ? (
                <div className="history-modal-loading">
                  <LoaderCircle
                    size={30}
                    className="is-spinning"
                  />
                  <p>Loading booking detail...</p>
                </div>
              ) : detailModal.error ? (
                <div className="history-modal-error">
                  <AlertCircle size={32} />
                  <h3>Unable to load booking</h3>
                  <p>{detailModal.error}</p>
                </div>
              ) : (
                detailModal.data && (
                  <>
                    <header className="history-modal-header">
                      <div>
                        <span>Booking detail</span>
                        <h2 id="booking-history-modal-title">
                          {detailModal.data.bookingCode ||
                            `BK-${detailModal.data.id}`}
                        </h2>
                      </div>

                      <span
                        className={`history-status history-status-${normalizeStatus(
                          detailModal.data.status
                        ).toLowerCase()}`}
                      >
                        {getStatusLabel(detailModal.data.status)}
                      </span>
                    </header>

                    <div className="history-detail-highlight">
                      <div className="history-detail-vehicle-icon">
                        {getVehicleIcon(
                          detailModal.data.vehicleTypeName
                        )}
                      </div>

                      <div>
                        <span>License plate</span>
                        <strong>
                          {detailModal.data.licensePlate || 'N/A'}
                        </strong>
                        <small>
                          {detailModal.data.vehicleTypeName ||
                            'Unknown vehicle'}
                          {detailModal.data.vehicleColor
                            ? ` · ${detailModal.data.vehicleColor}`
                            : ''}
                        </small>
                      </div>
                    </div>

                    <div className="history-detail-grid">
                      <DetailItem
                        icon={<User size={17} />}
                        label="Customer"
                        value={
                          detailModal.data.customerName ||
                          detailModal.data.customerEmail ||
                          'N/A'
                        }
                      />

                      <DetailItem
                        icon={<Hash size={17} />}
                        label="Booking ID"
                        value={detailModal.data.id}
                      />

                      <DetailItem
                        icon={<MapPin size={17} />}
                        label="Parking location"
                        value={`${
                          detailModal.data.floorName || 'N/A'
                        } · ${
                          detailModal.data.slotCode || 'N/A'
                        }`}
                      />

                      <DetailItem
                        icon={<CalendarDays size={17} />}
                        label="Created at"
                        value={formatDateTime(
                          detailModal.data.bookingTime
                        )}
                      />

                      <DetailItem
                        icon={<Clock size={17} />}
                        label="Start time"
                        value={formatDateTime(
                          detailModal.data.startTime
                        )}
                      />

                      <DetailItem
                        icon={<Clock size={17} />}
                        label="End time"
                        value={formatDateTime(
                          detailModal.data.endTime
                        )}
                      />

                      <DetailItem
                        icon={<Timer size={17} />}
                        label="Duration"
                        value={formatDuration(
                          detailModal.data.durationMinutes
                        )}
                      />

                      <DetailItem
                        icon={<CreditCard size={17} />}
                        label="Payment status"
                        value={getPaymentStatusLabel(
                          detailModal.data.paymentStatus
                        )}
                      />

                      <DetailItem
                        icon={<CircleDollarSign size={17} />}
                        label="Amount"
                        value={formatMoney(
                          detailModal.data.paymentAmount,
                          detailModal.data.paymentCurrency
                        )}
                      />

                      <DetailItem
                        icon={<ReceiptText size={17} />}
                        label="PayOS order code"
                        value={
                          detailModal.data.paymentOrderCode ||
                          'N/A'
                        }
                      />

                      <DetailItem
                        icon={<CheckCircle2 size={17} />}
                        label="Paid at"
                        value={formatDateTime(
                          detailModal.data.paidAt
                        )}
                      />

                      <DetailItem
                        icon={<History size={17} />}
                        label="Checked out at"
                        value={formatDateTime(
                          detailModal.data.checkedOutAt
                        )}
                      />
                    </div>

                    {detailModal.data.paymentDescription && (
                      <div className="history-detail-description">
                        <span>Payment description</span>
                        <p>
                          {detailModal.data.paymentDescription}
                        </p>
                      </div>
                    )}
                  </>
                )
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default BookingHistoryPage;
