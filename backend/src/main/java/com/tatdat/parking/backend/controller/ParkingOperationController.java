package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.ActiveParkingSessionResponse;
import com.tatdat.parking.backend.dto.CheckInRequest;
import com.tatdat.parking.backend.dto.CheckInResponse;
import com.tatdat.parking.backend.dto.CheckOutRequest;
import com.tatdat.parking.backend.dto.CheckOutResponse;
import com.tatdat.parking.backend.entity.ParkingSession;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.Payment;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.tatdat.parking.backend.dto.ParkingFloorStatsResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

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

    private final Random random = new Random();

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
                .orElseGet(() -> {
                    Vehicle newVehicle = new Vehicle();
                    newVehicle.setLicensePlate(licensePlate);
                    newVehicle.setVehicleType(vehicleType);

                    return vehicleRepository.save(newVehicle);
                });

        if (!vehicle.getVehicleType().getId().equals(vehicleType.getId())) {
            throw new RuntimeException("Vehicle type does not match this license plate");
        }

        parkingSessionRepository
                .findFirstByVehicle_LicensePlateAndStatus(licensePlate, "ACTIVE")
                .ifPresent(existingSession -> {
                    throw new RuntimeException("Vehicle is already checked in");
                });

        if (request.getFloorId() == null) {
            throw new RuntimeException("Parking floor is required");
        }

        ParkingSlot slot = parkingSlotRepository
                .findByVehicleType_IdAndZone_Floor_IdAndStatus(
                        request.getVehicleTypeId(),
                        request.getFloorId(),
                        "AVAILABLE"
                )
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No available slot for this vehicle type on selected floor"));
        LocalDateTime now = LocalDateTime.now();
        String ticketId = generateUniqueTicketId();

        ParkingSession savedSession = parkingSessionRepository.save(
                ParkingSession.builder()
                        .ticketId(ticketId)
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
                .ticketId(savedSession.getTicketId())
                .licensePlate(vehicle.getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(savedSession.getCheckInTime())
                .status(savedSession.getStatus())
                .build();
    }
    @GetMapping("/check-out/search")
    public CheckOutResponse searchCheckOut(
            @RequestParam(required = false) String ticketId,
            @RequestParam(required = false) String licensePlate
    ) {
        CheckOutRequest request = new CheckOutRequest();
        request.setTicketId(ticketId);
        request.setLicensePlate(licensePlate);

        ParkingSession session = findActiveSessionForCheckout(request);

        return buildCheckOutPreview(session);
    }

    @PostMapping("/check-out")
    public CheckOutResponse checkOut(@RequestBody CheckOutRequest request) {
        ParkingSession session = findActiveSessionForCheckout(request);

        CheckOutResponse preview = buildCheckOutPreview(session);

        LocalDateTime checkOutTime = LocalDateTime.now();

        session.setCheckOutTime(checkOutTime);
        session.setStatus("COMPLETED");
        parkingSessionRepository.save(session);

        ParkingSlot slot = session.getSlot();
        slot.setStatus("AVAILABLE");
        parkingSlotRepository.save(slot);

        Payment payment = Payment.builder()
                .parkingSession(session)
                .amount(preview.getTotalAmount())
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
                .ticketId(session.getTicketId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(session.getCheckInTime())
                .checkOutTime(checkOutTime)
                .durationHours(preview.getDurationHours())
                .pricePerHour(preview.getPricePerHour())
                .totalAmount(preview.getTotalAmount())
                .paymentStatus("PAID")
                .build();
    }

    @GetMapping("/active")
    public List<ActiveParkingSessionResponse> getActiveParkingSessions() {
        return parkingSessionRepository
                .findByStatusOrderByCheckInTimeDesc("ACTIVE")
                .stream()
                .map(session -> ActiveParkingSessionResponse.builder()
                        .sessionId(session.getId())
                        .ticketId(session.getTicketId())
                        .licensePlate(session.getVehicle().getLicensePlate())
                        .vehicleType(session.getVehicle().getVehicleType().getTypeName())
                        .slotCode(session.getSlot().getSlotCode())
                        .checkInTime(session.getCheckInTime())
                        .status(session.getStatus())
                        .build())
                .toList();
    }

    @GetMapping("/floor-stats")
    public List<ParkingFloorStatsResponse> getParkingFloorStats() {
        return parkingSlotRepository.getParkingFloorStats();
    }

    private CheckOutResponse buildCheckOutPreview(ParkingSession session) {
        LocalDateTime currentTime = LocalDateTime.now();

        long minutes = Duration.between(session.getCheckInTime(), currentTime).toMinutes();
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

        return CheckOutResponse.builder()
                .sessionId(session.getId())
                .ticketId(session.getTicketId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .slotCode(session.getSlot().getSlotCode())
                .checkInTime(session.getCheckInTime())
                .checkOutTime(currentTime)
                .durationHours(durationHours)
                .pricePerHour(pricePerHour)
                .totalAmount(totalAmount)
                .paymentStatus("PENDING")
                .build();
    }

    private ParkingSession findActiveSessionForCheckout(CheckOutRequest request) {
        if (request.getTicketId() != null && !request.getTicketId().isBlank()) {
            String ticketId = request.getTicketId().trim().toUpperCase();

            return parkingSessionRepository
                    .findFirstByTicketIdAndStatus(ticketId, "ACTIVE")
                    .orElseThrow(() -> new RuntimeException("Active parking session not found"));
        }

        if (request.getLicensePlate() != null && !request.getLicensePlate().isBlank()) {
            String licensePlate = request.getLicensePlate().trim().toUpperCase();

            return parkingSessionRepository
                    .findFirstByVehicle_LicensePlateAndStatus(licensePlate, "ACTIVE")
                    .orElseThrow(() -> new RuntimeException("Active parking session not found"));
        }

        throw new RuntimeException("License plate or ticket id is required");
    }

    private String generateUniqueTicketId() {
        String ticketId;

        do {
            int number = 100000 + random.nextInt(900000);
            ticketId = "TK-" + number;
        } while (parkingSessionRepository.existsByTicketId(ticketId));

        return ticketId;
    }
}