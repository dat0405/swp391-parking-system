USE ParkingManagementDB;
GO

INSERT INTO parking_facilities (facility_name, address, status)
VALUES
(N'Main Parking Facility', N'FPT University HCMC', N'ACTIVE');
GO

INSERT INTO parking_floors (facility_id, floor_name)
VALUES
(1, N'Floor 1'),
(1, N'Floor 2');
GO

INSERT INTO parking_zones (floor_id, zone_name)
VALUES
(1, N'Zone A'),
(1, N'Zone B'),
(2, N'Zone C'),
(2, N'Zone D');
GO

INSERT INTO parking_slots (zone_id, vehicle_type_id, slot_code, status)
VALUES
-- Zone A - car slots
(1, 1, N'A-CAR-01', N'AVAILABLE'),
(1, 1, N'A-CAR-02', N'AVAILABLE'),
(1, 1, N'A-CAR-03', N'AVAILABLE'),
(1, 1, N'A-CAR-04', N'AVAILABLE'),
(1, 1, N'A-CAR-05', N'AVAILABLE'),

-- Zone B - bike slots
(2, 2, N'B-BIKE-01', N'AVAILABLE'),
(2, 2, N'B-BIKE-02', N'AVAILABLE'),
(2, 2, N'B-BIKE-03', N'AVAILABLE'),
(2, 2, N'B-BIKE-04', N'AVAILABLE'),
(2, 2, N'B-BIKE-05', N'AVAILABLE'),

-- Zone C - car slots
(3, 1, N'C-CAR-01', N'AVAILABLE'),
(3, 1, N'C-CAR-02', N'AVAILABLE'),
(3, 1, N'C-CAR-03', N'AVAILABLE'),
(3, 1, N'C-CAR-04', N'AVAILABLE'),
(3, 1, N'C-CAR-05', N'AVAILABLE'),

-- Zone D - bike slots
(4, 2, N'D-BIKE-01', N'AVAILABLE'),
(4, 2, N'D-BIKE-02', N'AVAILABLE'),
(4, 2, N'D-BIKE-03', N'AVAILABLE'),
(4, 2, N'D-BIKE-04', N'AVAILABLE'),
(4, 2, N'D-BIKE-05', N'AVAILABLE');
GO