USE master;
GO

IF DB_ID('ParkingManagementDB') IS NOT NULL
BEGIN
    ALTER DATABASE ParkingManagementDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ParkingManagementDB;
END
GO

CREATE DATABASE ParkingManagementDB;
GO

USE ParkingManagementDB;
GO

-- ═══════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════

CREATE TABLE roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    role_id INT NOT NULL,
    status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME,
    CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE vehicle_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type_name NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(255)
);

CREATE TABLE vehicles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,                          -- nullable (xe vãng lai)
    vehicle_type_id INT NOT NULL,
    license_plate NVARCHAR(20) NOT NULL UNIQUE,
    color NVARCHAR(30),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_vehicles_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_vehicles_vehicle_types FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
);

CREATE TABLE parking_facilities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    facility_name NVARCHAR(100) NOT NULL,
    address NVARCHAR(255),
    status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE parking_floors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    facility_id INT NOT NULL,
    floor_name NVARCHAR(50) NOT NULL,
    CONSTRAINT fk_floors_facilities FOREIGN KEY (facility_id) REFERENCES parking_facilities(id)
);

CREATE TABLE parking_zones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    floor_id INT NOT NULL,
    zone_name NVARCHAR(50) NOT NULL,
    CONSTRAINT fk_zones_floors FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
);

CREATE TABLE parking_slots (
    id INT IDENTITY(1,1) PRIMARY KEY,
    zone_id INT NOT NULL,
    vehicle_type_id INT NOT NULL,
    slot_code NVARCHAR(50) NOT NULL,
    status NVARCHAR(20) DEFAULT 'AVAILABLE',
    CONSTRAINT fk_slots_zones FOREIGN KEY (zone_id) REFERENCES parking_zones(id),
    CONSTRAINT fk_slots_vehicle_types FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
);

CREATE TABLE pricing_policies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_type_id INT NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    overtime_fee DECIMAL(10,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT GETDATE(),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekend_multiplier DECIMAL(10,2) DEFAULT 1,
    holiday_multiplier DECIMAL(10,2) DEFAULT 1,
    CONSTRAINT fk_pricing_vehicle_types FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
);

CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT,
    slot_id INT NOT NULL,
    booking_time DATETIME DEFAULT GETDATE(),
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    status NVARCHAR(20) DEFAULT 'PENDING',
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_bookings_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_vehicles FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    CONSTRAINT fk_bookings_slots FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

CREATE TABLE parking_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id NVARCHAR(20) UNIQUE,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    check_in_time DATETIME NOT NULL DEFAULT GETDATE(),
    check_out_time DATETIME,
    status NVARCHAR(20) DEFAULT 'ACTIVE',
    ticket_status NVARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT fk_sessions_vehicles FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    CONSTRAINT fk_sessions_slots FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

CREATE TABLE payments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    parking_session_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method NVARCHAR(50),
    payment_status NVARCHAR(20) DEFAULT 'UNPAID',
    payment_time DATETIME DEFAULT GETDATE(),
    transaction_code NVARCHAR(255),
    CONSTRAINT fk_payments_sessions FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
);

CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action NVARCHAR(100) NOT NULL,
    description NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_audit_logs_users FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE booking_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id INT NOT NULL,
    license_plate NVARCHAR(255),
    color NVARCHAR(255),
    updated_at DATETIME DEFAULT GETDATE(),
    updated_by NVARCHAR(255),
    reason NVARCHAR(255),
    CONSTRAINT fk_booking_history_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE parking_exceptions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    parking_session_id INT,
    booking_history_id INT,
    handled_by INT NOT NULL,
    type NVARCHAR(255) NOT NULL,
    status NVARCHAR(255) DEFAULT 'PENDING',
    original_amount DECIMAL(38,2),
    final_amount DECIMAL(38,2),
    reason NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    resolved_at DATETIME,
    CONSTRAINT fk_exceptions_session FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id),
    CONSTRAINT fk_exceptions_booking_history FOREIGN KEY (booking_history_id) REFERENCES booking_history(id),
    CONSTRAINT fk_exceptions_user FOREIGN KEY (handled_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════

INSERT INTO roles (role_name) VALUES
('SYSTEM_ADMIN'),
('PARKING_MANAGER'),
('PARKING_STAFF'),
('DRIVER');

INSERT INTO vehicle_types (type_name, description) VALUES
('CAR', 'Car'),
('BIKE', 'Bike');

INSERT INTO pricing_policies
    (vehicle_type_id, price_per_hour, overtime_fee, status, base_price, weekend_multiplier, holiday_multiplier)
VALUES
    (1, 20000, 5000, 'ACTIVE', 0, 1.5, 2.0),   -- CAR
    (2, 5000,  2000, 'ACTIVE', 0, 1.5, 2.0);    -- BIKE

-- ═══════════════════════════════════════
-- DATA TEST (bỏ comment khi cần test Postman)
-- ═══════════════════════════════════════

/*
-- Staff user
INSERT INTO users (full_name, email, password, phone, role_id, status)
VALUES ('Nguyen Van Staff', 'staff@parking.com', '123456', '0901234567', 3, 'ACTIVE');

-- Driver user
INSERT INTO users (full_name, email, password, phone, role_id, status)
VALUES ('Tran Van Driver', 'driver@parking.com', '123456', '0909999999', 4, 'ACTIVE');

-- Vehicle (CAR)
INSERT INTO vehicles (user_id, vehicle_type_id, license_plate, color)
VALUES (2, 1, '51A-11111', 'Trang');

-- Facility → Floor → Zone → Slot
INSERT INTO parking_facilities (facility_name, address, status)
VALUES ('Parking A', '123 ABC', 'ACTIVE');

INSERT INTO parking_floors (facility_id, floor_name) VALUES (1, 'Tang 1');
INSERT INTO parking_zones (floor_id, zone_name) VALUES (1, 'Zone A');
INSERT INTO parking_slots (zone_id, vehicle_type_id, slot_code, status)
VALUES (1, 1, 'A01', 'OCCUPIED');

-- Parking session (check-in 2 tiếng trước)
INSERT INTO parking_sessions (vehicle_id, slot_id, check_in_time, status, ticket_status)
VALUES (1, 1, DATEADD(HOUR, -2, GETDATE()), 'ACTIVE', 'ACTIVE');

-- Booking (đặt trước 5 tiếng → đủ điều kiện giảm 10%)
INSERT INTO bookings (user_id, vehicle_id, slot_id, booking_time, start_time, end_time, status)
VALUES (2, 1, 1,
    DATEADD(HOUR, -5, GETDATE()),
    DATEADD(HOUR, -2, GETDATE()),
    DATEADD(HOUR,  3, GETDATE()),
    'CONFIRMED');
*/
