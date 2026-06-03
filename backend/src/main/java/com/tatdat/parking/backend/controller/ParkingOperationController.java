package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CheckInRequest;
import com.tatdat.parking.backend.dto.CheckInResponse;
import com.tatdat.parking.backend.dto.CheckOutRequest;
import com.tatdat.parking.backend.dto.CheckOutResponse;
import com.tatdat.parking.backend.entity.*;
import com.tatdat.parking.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/parking-operations")
@RequiredArgsConstructor
public class ParkingOperationController {

    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final PaymentRepository paymentRepository;

    @PostMapping("/check-in")
    public CheckInResponse checkIn(@RequestBody CheckInRequest request) {
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new RuntimeException("License plate is required");
        }

        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        String licensePlate = request.getLicensePlate().trim().toUpperCase();

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("Vehicle type not found"));

        Vehicle vehicle = vehicleRepository.findByLicensePlate(licensePlate)
                .orElseThrow(() -> new RuntimeException("Vehicle not found. Please create vehicle first"));

        if (!vehicle.getVehicleType().getId().equals(vehicleType.getId())) {
            throw new RuntimeException("Vehicle type does not match this license plate");
        }

        parkingSessionRepository
                .findFirstByVehicle_LicensePlateAndStatus(licensePlate, "ACTIVE")
                .ifPresent(existingSession -> {
                    throw new RuntimeException("Vehicle is already checked in");
                });

        ParkingSlot slot = parkingSlotRepository
                .findByVehicleType_IdAndStatus(request.getVehicleTypeId(), "AVAILABLE")
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No available slot for this vehicle type"));

        LocalDateTime now = LocalDateTime.now();

        ParkingSession savedSession = parkingSessionRepository.save(
                ParkingSession.builder()
                        .vehicle(vehicle)
                        .slot(slot)
                        .checkInTime(now)
                        .status("ACTIVE")
                        .build()
        );

        slot.setStatus("OCCUPIED");
        parkingSlotRepository.save(slot);

        return CheckInResponse.builder()
                .sessionId(savedSession.getId())
                .licensePlate(vehicle.getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(savedSession.getCheckInTime())
                .status(savedSession.getStatus())
                .build();
    }

    @PostMapping("/check-out")
    public CheckOutResponse checkOut(@RequestBody CheckOutRequest request) {
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new RuntimeException("License plate is required");
        }

        String licensePlate = request.getLicensePlate().trim().toUpperCase();

        ParkingSession session = parkingSessionRepository
                .findFirstByVehicle_LicensePlateAndStatus(licensePlate, "ACTIVE")
                .orElseThrow(() -> new RuntimeException("Active parking session not found"));

        LocalDateTime checkOutTime = LocalDateTime.now();

        long minutes = Duration.between(session.getCheckInTime(), checkOutTime).toMinutes();
        long durationHours = (long) Math.ceil(minutes / 60.0);

        if (durationHours <= 0) {
            durationHours = 1;
        }

        Integer vehicleTypeId = session.getVehicle().getVehicleType().getId();

        PricingPolicy pricingPolicy = pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatus(vehicleTypeId, "ACTIVE")
                .orElseThrow(() -> new RuntimeException("Active pricing policy not found"));

        BigDecimal pricePerHour = pricingPolicy.getPricePerHour();

        BigDecimal totalAmount = pricePerHour
                .multiply(BigDecimal.valueOf(durationHours))
                .setScale(2, RoundingMode.HALF_UP);

        session.setCheckOutTime(checkOutTime);
        session.setStatus("COMPLETED");
        parkingSessionRepository.save(session);

        ParkingSlot slot = session.getSlot();
        slot.setStatus("AVAILABLE");
        parkingSlotRepository.save(slot);

        Payment payment = Payment.builder()
                .parkingSession(session)
                .amount(totalAmount)
                .paymentMethod(
                        request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()
                                ? "CASH"
                                : request.getPaymentMethod()
                )
                .paymentStatus("PAID")
                .paymentTime(checkOutTime)
                .build();

        paymentRepository.save(payment);

        return CheckOutResponse.builder()
                .sessionId(session.getId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(session.getCheckInTime())
                .checkOutTime(checkOutTime)
                .durationHours(durationHours)
                .pricePerHour(pricePerHour)
                .totalAmount(totalAmount)
                .paymentStatus("PAID")
                .build();
    }
}