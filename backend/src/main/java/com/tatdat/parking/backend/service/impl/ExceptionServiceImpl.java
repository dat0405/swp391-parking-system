package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.*;
import com.tatdat.parking.backend.entity.*;
import com.tatdat.parking.backend.enums.*;
import com.tatdat.parking.backend.repository.*;
import com.tatdat.parking.backend.service.ExceptionService;
import com.tatdat.parking.backend.service.FeeCalculatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ExceptionServiceImpl implements ExceptionService {

    private final ParkingSessionRepository parkingSessionRepository;
    private final ParkingExceptionRepository parkingExceptionRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final PaymentRepository paymentRepository;
    private final FeeCalculatorService feeCalculatorService;

    // ────────────────────────────────────────────────
    // 1. XỬ LÝ MẤT VÉ
    // ────────────────────────────────────────────────
    @Override
    public ParkingException handleLostTicket(LostTicketDTO dto) {

        ParkingSession session = parkingSessionRepository
                .findById(dto.getParkingSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if ("CLOSED".equalsIgnoreCase(session.getStatus())) {
            throw new RuntimeException(
                    "Parking session already closed");
        }

        User staff = userRepository.findById(dto.getHandledByUserId())
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        // Xác định phí phạt theo loại xe
        String vehicleTypeName = session.getVehicle()
                .getVehicleType()
                .getTypeName(); // "CAR" hoặc "BIKE"

        BigDecimal lostTicketFee = vehicleTypeName.equalsIgnoreCase("CAR")
                ? new BigDecimal("200000")
                : new BigDecimal("50000");

        // Tính phí đỗ xe thực tế
        PricingPolicy policy = pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatus(
                        session.getVehicle().getVehicleType().getId(), "ACTIVE")
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        LocalDateTime checkOut = LocalDateTime.now();
        BigDecimal parkingFee = feeCalculatorService.calculate(session, policy, checkOut);

        BigDecimal totalFee = parkingFee.add(lostTicketFee);

        // Cập nhật session
        session.setCheckOutTime(checkOut);
        session.setStatus("CLOSED");
        session.setTicketStatus("LOST");
        parkingSessionRepository.save(session);

        // Tạo payment
        Payment payment = paymentRepository
                .findByParkingSessionId(session.getId())
                .orElse(Payment.builder()
                        .parkingSession(session)
                        .paymentStatus("UNPAID")
                        .paymentTime(LocalDateTime.now())
                        .build());

        payment.setAmount(totalFee);

        paymentRepository.save(payment);

        // Ghi exception log
        ParkingException exception = ParkingException.builder()
                .parkingSession(session)
                .handledBy(staff)
                .type(ExceptionType.LOST_TICKET)
                .status(ExceptionStatus.RESOLVED)
                .originalAmount(parkingFee)
                .finalAmount(totalFee)
                .reason(dto.getReason() != null ? dto.getReason()
                        : "Lost ticket - fee applied: " + lostTicketFee)
                .createdAt(LocalDateTime.now())
                .resolvedAt(LocalDateTime.now())
                .build();

        return parkingExceptionRepository.save(exception);
    }

    // ────────────────────────────────────────────────
    // 2. SỬA THÔNG TIN XE SAI (Wrong Vehicle Info)
    // ────────────────────────────────────────────────
    @Override
    public ParkingException handleWrongVehicleInfo(Integer bookingId,
                                                   UpdateBookingVehicleDTO dto) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Vehicle vehicle = booking.getVehicle();
        if (vehicle == null) throw new RuntimeException("No vehicle on booking");

        User staff = userRepository.findById(dto.getHandledByUserId())
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        // Lưu lịch sử TRƯỚC khi sửa
        BookingHistory history = BookingHistory.builder()
                .vehicle(vehicle)
                .licensePlate(vehicle.getLicensePlate())
                .color(vehicle.getColor())
                .updatedAt(LocalDateTime.now())
                .updatedBy(staff.getFullName())
                .reason(dto.getReason())
                .build();
        bookingHistoryRepository.save(history);

        // Cập nhật thông tin mới lên Vehicle
        if (dto.getLicensePlate() != null) {

            if (dto.getLicensePlate().isBlank()) {
                throw new RuntimeException(
                        "License plate cannot be empty");
            }

            vehicleRepository
                    .findByLicensePlate(dto.getLicensePlate())
                    .ifPresent(v -> {

                        if (!v.getId().equals(vehicle.getId())) {
                            throw new RuntimeException(
                                    "License plate already exists");
                        }
                    });

            vehicle.setLicensePlate(dto.getLicensePlate());
        }
        if (dto.getColor() != null) {

            String newColor = dto.getColor().trim();

            if (newColor.isEmpty()) {
                throw new RuntimeException(
                        "Color cannot be empty");
            }

            vehicle.setColor(newColor);
        }
        vehicleRepository.save(vehicle);

        // Ghi exception log
        ParkingException exception = ParkingException.builder()
                .bookingHistory(history)
                .handledBy(staff)
                .type(ExceptionType.WRONG_VEHICLE_INFO)
                .status(ExceptionStatus.RESOLVED)
                .reason(dto.getReason())
                .createdAt(LocalDateTime.now())
                .resolvedAt(LocalDateTime.now())
                .build();

        return parkingExceptionRepository.save(exception);
    }

    // ────────────────────────────────────────────────
    // 3. ĐIỀU CHỈNH PHÍ THỦ CÔNG (Manual Fee Adjustment)
    // ────────────────────────────────────────────────
    @Override
    public ParkingException handleManualFeeAdjustment(ManualFeeAdjustmentDTO dto) {

        ParkingSession session = parkingSessionRepository
                .findById(dto.getParkingSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        User staff = userRepository.findById(dto.getHandledByUserId())
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        // Tính phí gốc theo policy
        PricingPolicy policy = pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatus(
                        session.getVehicle().getVehicleType().getId(), "ACTIVE")
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        LocalDateTime checkOut = session.getCheckOutTime() != null
                ? session.getCheckOutTime() : LocalDateTime.now();

        BigDecimal originalFee = feeCalculatorService.calculate(session, policy, checkOut);

        // Cập nhật payment với số tiền staff nhập tay
        Payment payment = paymentRepository
                .findByParkingSessionId(session.getId())
                .orElse(Payment.builder()
                        .parkingSession(session)
                        .paymentStatus("UNPAID")
                        .paymentTime(LocalDateTime.now())
                        .build());

        if (dto.getFinalAmount() == null) {
            throw new RuntimeException(
                    "Final amount is required");
        }

        if (dto.getFinalAmount()
                .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Final amount must be greater than 0");
        }

        if (dto.getFinalAmount()
                .compareTo(new BigDecimal("10000000")) > 0) {

            throw new RuntimeException(
                    "Final amount exceeds limit");
        }

        payment.setAmount(dto.getFinalAmount());
        paymentRepository.save(payment);

        // Ghi exception log
        ParkingException exception = ParkingException.builder()
                .parkingSession(session)
                .handledBy(staff)
                .type(ExceptionType.MANUAL_FEE_ADJUSTMENT)
                .status(ExceptionStatus.RESOLVED)
                .originalAmount(originalFee)
                .finalAmount(dto.getFinalAmount())
                .reason(dto.getReason())
                .createdAt(LocalDateTime.now())
                .resolvedAt(LocalDateTime.now())
                .build();

        return parkingExceptionRepository.save(exception);
    }
}