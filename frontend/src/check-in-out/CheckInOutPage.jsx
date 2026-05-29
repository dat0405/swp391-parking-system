import React, { useState, useEffect } from 'react';

import Header from '../dashboard/Header';
import { Search, SquarePlay, LogOut, ReceiptText } from 'lucide-react'; 

function CheckInOutPage() {
  // Khai báo các State điều khiển form nhập liệu Check-in đầu vào
  const [licensePlateIn, setLicensePlateIn] = useState('');
  const [vehicleType, setVehicleType] = useState('Car'); // Mặc định ban đầu là Car
  const [parkingFloor, setParkingFloor] = useState('A1');
  const [entryTime, setEntryTime] = useState('--:--:--');
  const [ticketId, setTicketId] = useState(`TK-${Math.floor(100000 + Math.random() * 900000)}`);

  // ================= QUẢN LÝ DATA TẦNG TỪ API (MOCKUP DATABASE) =================
  const [floorsData, setFloorsData] = useState([
    { id: 'G', name: 'Tầng G', availableSlots: 150, totalSlots: 150, type: 'Motorbike' },
    { id: 'A1', name: 'Tầng A1', availableSlots: 42, totalSlots: 100, type: 'Car' },
    { id: 'A2', name: 'Tầng A2', availableSlots: 15, totalSlots: 100, type: 'Car' }
  ]);

  // Tự động cập nhật tầng đỗ phù hợp (parkingFloor) mỗi khi vehicleType thay đổi
  useEffect(() => {
    const availableFloors = floorsData.filter(floor => floor.type === vehicleType);
    if (availableFloors.length > 0) {
      const defaultFloor = availableFloors.find(f => f.availableSlots > 0) || availableFloors[0];
      setParkingFloor(defaultFloor.id);
    }
  }, [vehicleType]); 

  // Tự động cập nhật Entry Time theo thời gian thực tế của máy tính
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0]; 
      setEntryTime(timeString);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000); 
    return () => clearInterval(interval);
  }, []);

  // 🛠️ HÀM XỬ LÝ SUBMIT CHECK-IN (ĐÃ KHỬ ALERT, ĐỒNG BỘ CHUÔNG HEADER)
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();

    const selectedFloor = floorsData.find(f => f.id === parkingFloor);
    
    // 1. Kiểm tra thực tế xem tầng được chọn có còn chỗ trống hay không
    if (selectedFloor && selectedFloor.availableSlots === 0) {
      // Bắn sự kiện báo lỗi Đầy Chỗ lên Chuông thông báo
      const errorMsg = `Cảnh báo: ${selectedFloor.name} đã đầy chỗ! Không thể Check-in cho xe ${licensePlateIn}.`;
      window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: errorMsg }));
      return; 
    }

    const checkInData = {
      licensePlate: licensePlateIn,
      type: vehicleType,
      floor: parkingFloor,
      time: entryTime,
      ticketId: ticketId
    };
    
    console.log("Dữ liệu chuẩn bị đẩy lên Backend khi Check-in:", checkInData);
    
    // 2. CẬP NHẬT TRỪ ĐI 1 CHỖ TRỐNG CỦA TẦNG ĐƯỢC CHỌN TRÊN STATE FRONTEND
    setFloorsData(prevFloors => 
      prevFloors.map(floor => 
        floor.id === parkingFloor 
          ? { ...floor, availableSlots: Math.max(0, floor.availableSlots - 1) } 
          : floor
      )
    );

    // ✨ 3. BẮN SỰ KIỆN TOÀN CỤC THAY THẾ CHO HÀM ALERT() CŨ
    const successMsg = `Check-in thành công cho xe ${licensePlateIn} tại ${selectedFloor?.name || parkingFloor}!`;
    const event = new CustomEvent('dispatchParkingNotification', { detail: successMsg });
    window.dispatchEvent(event);

    // Reset Form Input sau khi Check-in thành công
    setLicensePlateIn('');
    setTicketId(`TK-${Math.floor(100000 + Math.random() * 900000)}`); 

    // CHỖ TRỐNG KẾT NỐI API BACKEND (POST DATA) SAU NÀY:
    /*
    try {
      const response = await fetch('http://localhost:8080/api/parking/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData)
      });
      const result = await response.json();
    } catch (error) {
      console.error("Lỗi gửi API Check-in:", error);
    }
    */
  };


  // =========================================================================
  // 2. QUẢN LÝ STATE CHO PHẦN CHECK-OUT (BÊN PHẢI)
  // =========================================================================
  const [searchCheckoutQuery, setSearchCheckoutQuery] = useState('');
  const [checkoutData, setCheckoutData] = useState({
    licensePlate: 'XYZ-9876',
    slot: 'P1-A05 • Level 1',
    entryTime: 'Oct 24, 09:15 AM',
    currentTime: 'Oct 24, 02:45 PM',
    duration: '5h 30m',
    pricingTier: 'Premium Day Rate',
    parkingFee: 22.00,
    serviceCharge: 1.50,
    totalAmount: 23.50
  });

  // 🛠️ HÀM XỬ LÝ SEARCH BIỂN SỐ / VÉ ĐỂ CHECK-OUT
  const handleSearchCheckout = async (e) => {
    e.preventDefault();
    console.log("Đang tìm kiếm xe check-out với từ khóa:", searchCheckoutQuery);

    // CHỖ TRỐNG KẾT NỐI API BACKEND (GET DATA):
    /*
    try {
      const response = await fetch(`http://localhost:8080/api/parking/search-checkout?query=${searchCheckoutQuery}`);
      const data = await response.json();
      setCheckoutData(data); 
    } catch (error) {
      console.error("Lỗi gọi API tìm kiếm xe:", error);
    }
    */
  };

  // 🛠️ HÀM XỬ LÝ XÁC NHẬN THANH TOÁN (ĐÃ KHỬ ALERT, ĐỒNG BỘ CHUÔNG HEADER)
  const handleConfirmCheckOut = async () => {
    console.log("Xác nhận cho xe ra, tính tiền hoàn tất:", checkoutData.licensePlate);

    // ✨ BẮN SỰ KIỆN THÔNG BÁO CHECK-OUT THÀNH CÔNG LÊN CHUÔNG HEADER
    const checkoutMsg = `Check-out & Thanh toán thành công cho xe ${checkoutData.licensePlate}! Số tiền: $${checkoutData.totalAmount.toFixed(2)}`;
    const event = new CustomEvent('dispatchParkingNotification', { detail: checkoutMsg });
    window.dispatchEvent(event);

    // CHỖ TRỐNG KẾT NỐI API BACKEND (UPDATE STATUS):
    /*
    try {
      const response = await fetch(`http://localhost:8080/api/parking/check-out/${checkoutData.licensePlate}`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error("Lỗi gọi API Check-out:", error);
    }
    */
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        {/* Tiêu đề Portal */}
        <div className="dashboard-title" style={{ padding: '1.5rem 0 0.5rem 0' }}>
          <h1 style={{ color: '#fff', fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Check-in/out Portal</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Manage vehicle flow and real-time gate operations.</p>
        </div>

        {/* Khu vực xử lý hai cột Check-in và Check-out */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
          
          {/* ================= THẺ TRÁI: CHECK-IN ENTRY ================= */}
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <SquarePlay size={18} style={{ color: '#3b82f6' }} /> Check-in Entry
            </h3>
            
            <form onSubmit={handleCheckInSubmit}>
              {/* Biển số xe */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                  LICENSE PLATE NUMBER
                </label>
                <input 
                  type="text" 
                  value={licensePlateIn}
                  placeholder="e.g., 51K-123.45" 
                  maxLength={10} 
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', outline: 'none', letterSpacing: '1px', fontWeight: '600' }}
                  required
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
                    if (value.length > 3) {
                      value = value.slice(0, 3) + '-' + value.slice(3);
                    }
                    if (value.length > 7) {
                      value = value.slice(0, 7) + '.' + value.slice(7, 9);
                    }
                    setLicensePlateIn(value);
                  }}
                />
              </div>

              {/* Loại xe & Tầng Đỗ Dữ Liệu Động */}
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
                    disabled={floorsData.filter(floor => floor.type === vehicleType).length <= 1}
                  >
                    {vehicleType === 'Motorbike' ? (
                      floorsData
                        .filter(floor => floor.type === 'Motorbike')
                        .map(floor => (
                          <option key={floor.id} value={floor.id}>
                            {floor.name} (Trống: {floor.availableSlots}/{floor.totalSlots})
                          </option>
                        ))
                    ) : (
                      floorsData
                        .filter(floor => floor.type === 'Car')
                        .map(floor => (
                          <option key={floor.id} value={floor.id} disabled={floor.availableSlots === 0}>
                            {floor.name} ({floor.availableSlots > 0 ? `Còn trống ${floor.availableSlots} chỗ` : 'Đã đầy'})
                          </option>
                        ))
                    )}
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

              {/* Nút Confirm Check-In */}
              <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
                Confirm Check-in
              </button>
            </form>
          </div>

          {/* ================= THẺ PHẢI: CHECK-OUT EXIT ================= */}
          <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <LogOut size={18} style={{ color: '#10b981' }} /> Check-out Exit
            </h3>

            {/* Ô tìm kiếm nhanh biển số để tính tiền */}
            <form onSubmit={handleSearchCheckout} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  value={searchCheckoutQuery}
                  onChange={(e) => setSearchCheckoutQuery(e.target.value)}
                  placeholder="Scan ticket or enter plate..." 
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', outline: 'none' }}
                />
              </div>
              <button type="submit" style={{ padding: '0 1rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: '600', cursor: 'pointer' }}>SEARCH</button>
            </form>

            {/* Khối hiển thị chi tiết hóa đơn thanh toán */}
            <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>{checkoutData.licensePlate}</h4>
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

            {/* Nút Confirm Check-Out */}
            <button onClick={handleConfirmCheckOut} style={{ width: '100%', padding: '1rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
              Confirm Check-out
            </button>
          </div>

        </div>

        {/* ================= KHỐI LỊCH SỬ GẦN ĐÂY BÊN DƯỚI ================= */}
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ReceiptText size={18} style={{ color: '#94a3b8' }} /> Recent Parking Sessions
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>[Chỗ này chừa sẵn bảng danh sách lịch sử xe ra vào lấy dữ liệu API sau này...]</p>
        </div>

      </main>
    </div>
  );
}

export default CheckInOutPage;