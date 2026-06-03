import React, { useState, useEffect } from 'react';
import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';
import { Search, SquarePlay, LogOut, ReceiptText } from 'lucide-react'; 

function CheckInOutPage() {
  // Helper function sinh Ticket ID ngẫu nhiên
  const generateTicketId = () => `TK-${Math.floor(100000 + Math.random() * 900000)}`;

  // ================= 1. MOCK DATABASE (STATE CHUNG) =================
  const [floorsData, setFloorsData] = useState([
    { id: 'G', name: 'Floor G', availableSlots: 150, totalSlots: 150, type: 'Motorbike' },
    { id: 'A1', name: 'Floor A1', availableSlots: 42, totalSlots: 100, type: 'Car' },
    { id: 'A2', name: 'Floor A2', availableSlots: 0, totalSlots: 100, type: 'Car' } 
  ]);

  const [activeSessions, setActiveSessions] = useState([
    {
      ticketId: 'TK-122682',
      licensePlate: 'XYZ-9876',
      vehicleType: 'Car',
      floorId: 'A1',
      slot: 'P1-A05 • Floor A1',
      entryTime: 'Oct 24, 09:15 AM',
      currentTime: 'Oct 24, 02:45 PM',
      duration: '5h 30m',
      pricingTier: 'Premium Day Rate',
      parkingFee: 22.00,
      serviceCharge: 1.50,
      totalAmount: 23.50
    }
  ]);

  // ================= 2. CHECK-IN FORM STATES =================
  const [licensePlateIn, setLicensePlateIn] = useState('');
  const [vehicleType, setVehicleType] = useState('Car'); 
  const [parkingFloor, setParkingFloor] = useState('A1');
  const [entryTime, setEntryTime] = useState('--:--:--');
  const [ticketId, setTicketId] = useState(() => generateTicketId()); 

  // ================= 3. CHECK-OUT FORM STATES =================
  const [searchPlate, setSearchPlate] = useState('');
  const [searchTicketId, setSearchTicketId] = useState('');
  const [checkoutData, setCheckoutData] = useState(null);

  // ================= 4. FORMAT FUNCTIONS =================
  // Format biển số xe tự động (Hỗ trợ linh hoạt xóa lùi)
  const formatPlate = (value) => {
    let raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    if (raw.length <= 3) return raw;

    const prefix = raw.slice(0, 3);
    const suffix = raw.slice(3);

    if (suffix.length > 3) {
      return `${prefix}-${suffix.slice(0, 3)}.${suffix.slice(3, 5)}`;
    }
    return `${prefix}-${suffix}`;
  };

  // Format Vé xe (An toàn tuyệt đối, không lo kẹt ký tự TK-)
  const formatTicket = (value) => {
    let clean = value.toUpperCase().replace(/^TK-/, '');
    let raw = clean.replace(/[^0-9]/g, '');
    
    if (raw.length > 6) raw = raw.slice(0, 6);
    return raw.length ? `TK-${raw}` : '';
  };

  // Tự động chọn tầng phù hợp khi đổi Vehicle Type
  useEffect(() => {
    const availableFloors = floorsData.filter(floor => floor.type === vehicleType);
    if (availableFloors.length > 0) {
      const defaultFloor = availableFloors.find(f => f.availableSlots > 0) || availableFloors[0];
      setParkingFloor(defaultFloor.id);
    }
  }, [vehicleType, floorsData]); 

  // Đồng hồ chạy thời gian thực cho ô Entry Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setEntryTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000); 
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // 🛠️ HANDLER 1: XỬ LÝ CHECK-IN
  // =========================================================================
  const handleCheckInSubmit = (e) => {
    e.preventDefault();
    if (!licensePlateIn.trim()) return;

    const selectedFloor = floorsData.find(f => f.id === parkingFloor);
    
    if (selectedFloor && selectedFloor.availableSlots === 0) {
      const errorMsg = `Warning: ${selectedFloor.name} is full! Cannot check-in vehicle ${licensePlateIn}.`;
      window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: errorMsg }));
      return; 
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + `, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const newSession = {
      ticketId: ticketId,
      licensePlate: licensePlateIn, 
      vehicleType: vehicleType,
      floorId: parkingFloor,
      slot: `P1-${Math.floor(10 + Math.random() * 89)} • ${selectedFloor?.name}`,
      entryTime: formattedDate,
      currentTime: 'Calculating...',
      duration: '0h 01m (Test Mode)',
      pricingTier: vehicleType === 'Car' ? 'Premium Day Rate' : 'Standard Bike Rate',
      parkingFee: vehicleType === 'Car' ? 22.00 : 5.00,
      serviceCharge: 1.50,
      totalAmount: vehicleType === 'Car' ? 23.50 : 6.50
    };

    setActiveSessions(prev => [newSession, ...prev]);

    setFloorsData(prevFloors => 
      prevFloors.map(floor => 
        floor.id === parkingFloor 
          ? { ...floor, availableSlots: Math.max(0, floor.availableSlots - 1) } 
          : floor
      )
    );

    const successMsg = `Successfully checked in vehicle ${licensePlateIn} at ${selectedFloor?.name || parkingFloor}! Slot reserved.`;
    window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: successMsg }));

    setLicensePlateIn('');
    setTicketId(generateTicketId()); 
  };

  // =========================================================================
  // 🛠️ HANDLER 2: XỬ LÝ SEARCH CHECK-OUT (TÌM THEO BIỂN SỐ HOẶC VÉ)
  // =========================================================================
  const handleSearchCheckout = (e) => {
    if (e) e.preventDefault();

    const plate = searchPlate.trim().toUpperCase();
    const ticket = searchTicketId.trim().toUpperCase();

    if (!plate && !ticket) {
      alert("Please enter License Plate or Ticket ID");
      return;
    }

    // Kiểm tra định dạng nếu người dùng có nhập liệu
    const plateRegex = /^[0-9]{2}[A-Z]-[0-9]{3,4}\.[0-9]{2}$|^[0-9]{2}[A-Z]-[0-9]{4,5}$|^[A-Z0-9-]+$/;
    const ticketRegex = /^TK-[0-9]{6}$/;

    if (plate && !plateRegex.test(plate)) {
      alert("Invalid License Plate format (e.g., 51K-666.66)");
      return;
    }

    if (ticket && !ticketRegex.test(ticket)) {
      alert("Invalid Ticket format (e.g., TK-926006)");
      return;
    }

    // Tiến hành truy quét thực tế
    const found = activeSessions.find((s) =>
      (plate && s.licensePlate.toUpperCase() === plate) ||
      (ticket && s.ticketId.toUpperCase() === ticket)
    );

    if (!found) {
      alert("❌ Vehicle not found in system!");
      setCheckoutData(null);
      return;
    }

    const now = new Date();
    const currentFormatted =
      now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) +
      ', ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setCheckoutData({
      ...found,
      currentTime: currentFormatted
    });
  };

  // =========================================================================
  // 🛠️ HANDLER 3: XỬ LÝ XÁC NHẬN TRẢ XE (XÓA XE & HOÀN SLOT & RESET STATE)
  // =========================================================================
  const handleConfirmCheckOut = () => {
    if (!checkoutData) {
      alert("Vui lòng search tìm một xe cụ thể trước khi thực hiện Check-out!");
      return;
    }

    const targetFloorId = checkoutData.floorId;
    const plate = checkoutData.licensePlate;

    setFloorsData(prevFloors => 
      prevFloors.map(floor => 
        floor.id === targetFloorId 
          ? { ...floor, availableSlots: Math.min(floor.totalSlots, floor.availableSlots + 1) } 
          : floor
      )
    );

    setActiveSessions(prev => prev.filter(session => session.licensePlate !== plate));

    const checkoutMsg = `Checkout successful for vehicle ${plate}! 1 Slot returned to Floor ${targetFloorId}.`;
    window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: checkoutMsg }));

    // Xóa sạch trạng thái form tìm kiếm sau khi thanh toán thành công
    setSearchPlate('');
    setSearchTicketId('');
    setCheckoutData(null);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content" style={{ padding: '1.5rem 2rem', boxSizing: 'border-box' }}>
        <Header />

        {/* Portal Header */}
        <div className="dashboard-title" style={{ padding: '1.5rem 0 0.5rem 0' }}>
          <h1 style={{ color: '#fff', fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Check-in/out Portal</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Manage vehicle flow and real-time gate operations.</p>
        </div>

        {/* Two-Column Form Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
          
          {/* ================= LEFT SIDE: CHECK-IN ENTRY ================= */}
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <SquarePlay size={18} style={{ color: '#3b82f6' }} /> Check-in Entry
            </h3>
            
            <form onSubmit={handleCheckInSubmit}>
              {/* Input Biển số xe */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                  LICENSE PLATE NUMBER
                </label>
                <input 
                  type="text" 
                  value={licensePlateIn}
                  placeholder="e.g., 51K-111.11" 
                  maxLength={10} 
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', outline: 'none', letterSpacing: '1px', fontWeight: '600' }}
                  required
                  onChange={(e) => setLicensePlateIn(formatPlate(e.target.value))}
                />
              </div>

              {/* Loại xe & Chọn tầng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>VEHICLE TYPE</label>
                  <select 
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="Car">Car</option>
                    <option value="Motorbike">Motorbike</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>PARKING FLOOR</label>
                  <select 
                    value={parkingFloor} 
                    onChange={(e) => setParkingFloor(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', cursor: 'pointer', outline: 'none' }}
                  >
                    {floorsData.filter(floor => floor.type === vehicleType).map(floor => (
                      <option key={floor.id} value={floor.id} disabled={floor.availableSlots === 0}>
                        {floor.name} ({floor.availableSlots > 0 ? `Vacant: ${floor.availableSlots}/${floor.totalSlots}` : 'Full House'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thời gian vào & Mã vé */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>ENTRY TIME</label>
                  <input type="text" value={entryTime} readOnly style={{ width: '100%', padding: '0.75rem', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#94a3b8', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>TICKET ID</label>
                  <input type="text" value={ticketId} readOnly style={{ width: '100%', padding: '0.75rem', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#94a3b8', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
                Confirm Check-in
              </button>
            </form>
          </div>

          {/* ================= RIGHT SIDE: CHECK-OUT EXIT ================= */}
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <LogOut size={18} style={{ color: '#10b981' }} /> Check-out Exit
            </h3>

            {/* Thanh Tìm Kiếm Check-out cải tiến với 2 ô Input */}
            <form onSubmit={handleSearchCheckout} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {/* Ô BIỂN SỐ XE */}
              <input
                type="text"
                value={searchPlate}
                placeholder="Biển số (51K-666.66)"
                onChange={(e) => setSearchPlate(formatPlate(e.target.value))}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  outline: 'none',
                  letterSpacing: '1px',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              />

              {/* Ô MÃ VÉ XE */}
              <input
                type="text"
                value={searchTicketId}
                placeholder="Mã vé (TK-926006)"
                onChange={(e) => setSearchTicketId(formatTicket(e.target.value))}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  outline: 'none',
                  letterSpacing: '1px',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              />

              <button 
                type="submit" 
                style={{ 
                  padding: '0 1.5rem', 
                  backgroundColor: '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
              >
                SEARCH
              </button>
            </form>

            {/* Khối Hóa Đơn Hiển Thị Động */}
            {checkoutData ? (
              <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', letterSpacing: '1px' }}>{checkoutData.licensePlate}</h4>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Slot: {checkoutData.slot}</span>
                  </div>
                  <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '600', height: 'fit-content' }}>STAY ACTIVE</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>ENTRY TIME<div style={{ color: '#fff', marginTop: '0.2rem' }}>{checkoutData.entryTime}</div></div>
                  <div>CURRENT TIME<div style={{ color: '#fff', marginTop: '0.2rem' }}>{checkoutData.currentTime}</div></div>
                  <div>DURATION<div style={{ color: '#fff', marginTop: '0.2rem' }}>{checkoutData.duration}</div></div>
                  <div>PRICING TIER<div style={{ color: '#fff', marginTop: '0.2rem' }}>{checkoutData.pricingTier}</div></div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Parking Fee</span><span style={{ color: '#fff' }}>${checkoutData.parkingFee.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Service Charge</span><span style={{ color: '#fff' }}>${checkoutData.serviceCharge.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '700', color: '#fff', borderTop: '1px dashed #334155', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <span>Total Amount</span>
                    <span style={{ color: '#10b981' }}>${checkoutData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#0f172a', padding: '2rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px dashed #334155', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                No payment information available. Please enter a license plate number or ticket ID and click SEARCH to check.
              </div>
            )}

            {/* Nút hành động Xác nhận trả xe */}
            <button 
              onClick={handleConfirmCheckOut} 
              disabled={!checkoutData}
              style={{ width: '100%', padding: '1rem', backgroundColor: checkoutData ? '#10b981' : '#334155', color: checkoutData ? '#fff' : '#64748b', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: checkoutData ? 'pointer' : 'not-allowed' }}
            >
              Confirm Check-out
            </button>
          </div>

        </div>

        {/* ================= BOTTOM SIDE: DANH SÁCH XE TRONG BÃI THỰC TẾ ================= */}
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ReceiptText size={18} style={{ color: '#3b82f6' }} /> Danh Sách Xe Đang Đỗ Trong Hệ Thống ({activeSessions.length} xe)
          </h3>
          {activeSessions.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Bãi xe trống trơn, hãy thực hiện check-in thêm xe mới.</p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeSessions.map((session) => (
                <div 
                  key={session.ticketId}
                  onClick={() => {
                    // Đồng bộ dữ liệu sang cả 2 ô input và tự điền hóa đơn bên phải luôn
                    setSearchPlate(session.licensePlate);
                    setSearchTicketId(session.ticketId);
                    
                    const now = new Date();
                    setCheckoutData({
                      ...session,
                      currentTime: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    });
                  }}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                  title="Click nhanh để chọn xe này làm thủ tục Check-out"
                >
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>{session.licensePlate}</span>
                  <span style={{ color: '#3b82f6', fontSize: '0.7rem' }}>Tầng: {session.floorId} | {session.ticketId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default CheckInOutPage;