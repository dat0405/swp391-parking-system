import React, { useState, useEffect } from 'react';
import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';
import { Search, SquarePlay, LogOut, ReceiptText } from 'lucide-react'; 

function CheckInOutPage() {
  // Helper function to generate a stable initial Ticket ID
  const generateTicketId = () => `TK-${Math.floor(100000 + Math.random() * 900000)}`;

  // ================= 1. CHECK-IN FORM STATES =================
  const [licensePlateIn, setLicensePlateIn] = useState('');
  const [vehicleType, setVehicleType] = useState('Car'); 
  const [parkingFloor, setParkingFloor] = useState('A1');
  const [entryTime, setEntryTime] = useState('--:--:--');
  // Initializing via callback prevents re-running Math.random() on every re-render
  const [ticketId, setTicketId] = useState(() => generateTicketId()); 

  // MOCKUP DATABASE FOR FLOORS
  const [floorsData, setFloorsData] = useState([
    { id: 'G', name: 'Floor G', availableSlots: 150, totalSlots: 150, type: 'Motorbike' },
    { id: 'A1', name: 'Floor A1', availableSlots: 42, totalSlots: 100, type: 'Car' },
    { id: 'A2', name: 'Floor A2', availableSlots: 0, totalSlots: 100, type: 'Car' } 
  ]);

  // ================= 2. CHECK-OUT FORM STATES =================
  const [searchCheckoutQuery, setSearchCheckoutQuery] = useState('');
  const [checkoutData, setCheckoutData] = useState({
    licensePlate: 'XYZ-9876',
    floorId: 'A1', // Kept to release slot on successful checkout
    slot: 'P1-A05 • Floor A1',
    entryTime: 'Oct 24, 09:15 AM',
    currentTime: 'Oct 24, 02:45 PM',
    duration: '5h 30m',
    pricingTier: 'Premium Day Rate',
    parkingFee: 22.00,
    serviceCharge: 1.50,
    totalAmount: 23.50
  });

  // Automatically update the parking floor when vehicle type changes
  useEffect(() => {
    const availableFloors = floorsData.filter(floor => floor.type === vehicleType);
    if (availableFloors.length > 0) {
      // Prioritize choosing a floor that still has available slots
      const defaultFloor = availableFloors.find(f => f.availableSlots > 0) || availableFloors[0];
      setParkingFloor(defaultFloor.id);
    }
  }, [vehicleType]); 

  // Live digital clock loop for Entry Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setEntryTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000); 
    return () => clearInterval(interval);
  }, []);

  // 🛠️ HANDLER: CHECK-IN SUBMIT
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    const selectedFloor = floorsData.find(f => f.id === parkingFloor);
    
    // Safety check if the selected floor is full
    if (selectedFloor && selectedFloor.availableSlots === 0) {
      const errorMsg = `Warning: ${selectedFloor.name} is full! Cannot check-in vehicle ${licensePlateIn}.`;
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
    
    console.log("Payload preparing for backend Check-In API:", checkInData);
    
    /*
    // BACKEND INTEGRATION PLACEHOLDER:
    try {
      const response = await fetch('http://localhost:8080/api/parking/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData)
      });
      if (!response.ok) throw new Error("Server Error");
      const result = await response.json();
    } catch (error) {
      console.error("Check-in API error:", error);
    }
    */

    // Update Frontend State: Subtract 1 available slot
    setFloorsData(prevFloors => 
      prevFloors.map(floor => 
        floor.id === parkingFloor 
          ? { ...floor, availableSlots: Math.max(0, floor.availableSlots - 1) } 
          : floor
      )
    );

    // Global Header Notification Broadcast
    const successMsg = `Successfully checked in vehicle ${licensePlateIn} at ${selectedFloor?.name || parkingFloor}!`;
    window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: successMsg }));

    // Reset input form
    setLicensePlateIn('');
    setTicketId(generateTicketId()); 
  };

  // 🛠️ HANDLER: SEARCH TICKET/PLATE FOR CHECK-OUT
  const handleSearchCheckout = async (e) => {
    e.preventDefault();
    if (!searchCheckoutQuery.trim()) return;

    console.log("Searching backend database for query:", searchCheckoutQuery);

    /*
    // BACKEND INTEGRATION PLACEHOLDER:
    try {
      const response = await fetch(`http://localhost:8080/api/parking/search-checkout?query=${searchCheckoutQuery}`);
      const data = await response.json();
      setCheckoutData(data); 
    } catch (error) {
      console.error("Search API error:", error);
    }
    */
  };

  // 🛠️ HANDLER: CONFIRM PAYMENT & GATE EXIT (CHECK-OUT)
  const handleConfirmCheckOut = async () => {
    console.log("Confirming checkout and processing payment for:", checkoutData.licensePlate);

    /*
    // BACKEND INTEGRATION PLACEHOLDER:
    try {
      const response = await fetch(`http://localhost:8080/api/parking/check-out/${checkoutData.licensePlate}`, {
        method: 'PUT'
      });
      if (!response.ok) return;
    } catch (error) {
      console.error("Checkout API error:", error);
    }
    */

    // Update Frontend State: Increment and return 1 slot back to the floor capacity
    setFloorsData(prevFloors => 
      prevFloors.map(floor => 
        floor.id === checkoutData.floorId 
          ? { ...floor, availableSlots: Math.min(floor.totalSlots, floor.availableSlots + 1) } 
          : floor
      )
    );

    // Global Header Notification Broadcast
    const checkoutMsg = `Checkout & Payment successful for vehicle ${checkoutData.licensePlate}! Total Paid: $${checkoutData.totalAmount.toFixed(2)}`;
    window.dispatchEvent(new CustomEvent('dispatchParkingNotification', { detail: checkoutMsg }));
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
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
              {/* License Plate input field */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                  LICENSE PLATE NUMBER
                </label>
                <input 
                  type="text" 
                  value={licensePlateIn}
                  placeholder="e.g., 51K-123.45" 
                  maxLength={11} 
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.375rem', color: '#fff', outline: 'none', letterSpacing: '1px', fontWeight: '600' }}
                  required
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
                    if (value.length > 3) value = value.slice(0, 3) + '-' + value.slice(3);
                    if (value.length > 7) value = value.slice(0, 7) + '.' + value.slice(7, 10);
                    setLicensePlateIn(value);
                  }}
                />
              </div>

              {/* Dynamic Vehicle Type & Floor Selector */}
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

              {/* Entry Timestamp & Ticket ID Generation */}
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

              {/* Submit button */}
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

            {/* Scanning bar/search block */}
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

            {/* Invoice Summary Block */}
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

            {/* Action Checkout button */}
            <button onClick={handleConfirmCheckOut} style={{ width: '100%', padding: '1rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
              Confirm Check-out
            </button>
          </div>

        </div>

        {/* ================= BOTTOM SIDE: RECENT HISTORY ================= */}
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ReceiptText size={18} style={{ color: '#94a3b8' }} /> Recent Parking Sessions
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>[This space is reserved for the live history data table connected via APIs later...]</p>
        </div>

      </main>
    </div>
  );
}

export default CheckInOutPage;