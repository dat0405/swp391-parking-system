package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.BookingResponse;
import com.tatdat.parking.backend.dto.CreateBookingRequest;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.BookingHistory;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.BookingHistoryRepository;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private static final int PAYMENT_TIMEOUT_MINUTES = 10;

    private static final String SLOT_STATUS_AVAILABLE = "AVAILABLE";
    private static final String SLOT_STATUS_RESERVED = "RESERVED";
    private static final String SLOT_STATUS_OCCUPIED = "OCCUPIED";
    private static final String SLOT_STATUS_MAINTENANCE = "MAINTENANCE";

    private final BookingRepository bookingRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final UserRepository userRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByBookingTimeDesc()
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        validateCreateBookingRequest(request);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("Vehicle type not found"));

        ParkingSlot slot = parkingSlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new RuntimeException("Parking slot not found"));

        validateSlotForBooking(slot, vehicleType, request);

        String normalizedPlate = normalizeLicensePlate(request.getLicensePlate());

        Vehicle vehicle = vehicleRepository.findByLicensePlateIgnoreCase(normalizedPlate)
                .orElseGet(() -> {
                    Vehicle newVehicle = Vehicle.builder()
                            .user(user)
                            .vehicleType(vehicleType)
                            .licensePlate(normalizedPlate)
                            .color(normalizeNullableText(request.getColor()))
                            .createdAt(LocalDateTime.now())
                            .build();

                    return vehicleRepository.save(newVehicle);
                });

        if (vehicle.getUser() == null) {
            vehicle.setUser(user);
        }

        if (vehicle.getVehicleType() == null
                || !vehicle.getVehicleType().getId().equals(vehicleType.getId())) {
            vehicle.setVehicleType(vehicleType);
        }

        if (request.getColor() != null && !request.getColor().trim().isEmpty()) {
            vehicle.setColor(request.getColor().trim());
        }

        vehicleRepository.save(vehicle);

        LocalDateTime now = LocalDateTime.now();

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .slot(slot)
                .bookingTime(now)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(Booking.STATUS_PENDING_PAYMENT)
                .paymentExpiredAt(now.plusMinutes(PAYMENT_TIMEOUT_MINUTES))
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        /*
         * Important:
         * Do not set parking slot status to RESERVED here.
         *
         * bookings.status controls reservation by time range.
         * parking_slots.status should represent physical/live status:
         * AVAILABLE, OCCUPIED, MAINTENANCE, etc.
         */

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse updateVehicleInfo(Integer bookingId, UpdateBookingVehicleDTO dto) {
        Booking booking = findBookingOrThrow(bookingId);

        Vehicle vehicle = booking.getVehicle();

        if (vehicle == null) {
            throw new RuntimeException("Booking has no vehicle assigned");
        }

        if (dto.getHandledByUserId() == null) {
            throw new RuntimeException("Handled by user ID is required");
        }

        User staff = userRepository.findById(dto.getHandledByUserId())
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        BookingHistory history = BookingHistory.builder()
                .vehicle(vehicle)
                .licensePlate(vehicle.getLicensePlate())
                .color(vehicle.getColor())
                .updatedAt(LocalDateTime.now())
                .updatedBy(staff.getFullName())
                .reason(dto.getReason())
                .build();

        bookingHistoryRepository.save(history);

        if (dto.getLicensePlate() != null) {
            String newPlate = normalizeLicensePlate(dto.getLicensePlate());

            vehicleRepository.findByLicensePlateIgnoreCase(newPlate)
                    .ifPresent(existingVehicle -> {
                        if (!existingVehicle.getId().equals(vehicle.getId())) {
                            throw new RuntimeException("License plate already exists");
                        }
                    });

            vehicle.setLicensePlate(newPlate);
        }

        if (dto.getColor() != null) {
            String newColor = dto.getColor().trim();

            if (newColor.isEmpty()) {
                throw new RuntimeException("Color cannot be empty");
            }

            vehicle.setColor(newColor);
        }

        vehicleRepository.save(vehicle);

        Booking updatedBooking = findBookingOrThrow(bookingId);
        return BookingResponse.fromEntity(updatedBooking);
    }

    @Override
    @Transactional
    public BookingResponse confirmBooking(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);

        String currentStatus = normalizeStatus(booking.getStatus());

        if (Booking.STATUS_CANCELLED.equals(currentStatus)) {
            throw new RuntimeException("Cancelled booking cannot be confirmed");
        }

        if (Booking.STATUS_COMPLETED.equals(currentStatus)) {
            throw new RuntimeException("Completed booking cannot be confirmed again");
        }

        if (Booking.STATUS_EXPIRED.equals(currentStatus)) {
            throw new RuntimeException("Expired booking cannot be confirmed");
        }

        if (Booking.STATUS_NO_SHOW.equals(currentStatus)) {
            throw new RuntimeException("No-show booking cannot be confirmed");
        }

        if (Booking.STATUS_REFUNDED.equals(currentStatus)) {
            throw new RuntimeException("Refunded booking cannot be confirmed");
        }

        if (Booking.STATUS_CONFIRMED.equals(currentStatus)) {
            return BookingResponse.fromEntity(booking);
        }

        if (!Booking.STATUS_PENDING_PAYMENT.equals(currentStatus)) {
            throw new RuntimeException("Only pending payment booking can be confirmed");
        }

        if (booking.getPaymentExpiredAt() != null
                && booking.getPaymentExpiredAt().isBefore(LocalDateTime.now())) {
            booking.setStatus(Booking.STATUS_EXPIRED);
            Booking expiredBooking = bookingRepository.save(booking);
            throw new RuntimeException("Payment time expired. Booking has been expired.");
        }

        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                        booking.getSlot().getId(),
                        booking.getStartTime(),
                        booking.getEndTime()
                ).stream()
                .filter(item -> !item.getId().equals(booking.getId()))
                .toList();

        if (!overlappingBookings.isEmpty()) {
            throw new RuntimeException("Selected slot is already reserved in this time range");
        }

        booking.setStatus(Booking.STATUS_CONFIRMED);
        booking.setPaidAt(LocalDateTime.now());

        Booking savedBooking = bookingRepository.save(booking);

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);

        String currentStatus = normalizeStatus(booking.getStatus());

        if (Booking.STATUS_COMPLETED.equals(currentStatus)) {
            throw new RuntimeException("Completed booking cannot be cancelled");
        }

        if (Booking.STATUS_CANCELLED.equals(currentStatus)) {
            return BookingResponse.fromEntity(booking);
        }

        if (Booking.STATUS_REFUNDED.equals(currentStatus)) {
            throw new RuntimeException("Refunded booking cannot be cancelled");
        }

        booking.setStatus(Booking.STATUS_CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());

        Booking savedBooking = bookingRepository.save(booking);

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public void deleteBooking(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);
        bookingRepository.delete(booking);
    }

    private Booking findBookingOrThrow(Integer bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    private void validateCreateBookingRequest(CreateBookingRequest request) {
        if (request == null) {
            throw new RuntimeException("Booking request is required");
        }

        if (request.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }

        if (request.getSlotId() == null) {
            throw new RuntimeException("Slot ID is required");
        }

        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type ID is required");
        }

        if (request.getStartTime() == null) {
            throw new RuntimeException("Start time is required");
        }

        if (request.getEndTime() == null) {
            throw new RuntimeException("End time is required");
        }

        if (request.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Start time must be in the future");
        }

        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }

        if (request.getLicensePlate() == null || request.getLicensePlate().trim().isEmpty()) {
            throw new RuntimeException("License plate is required");
        }
    }

    private void validateSlotForBooking(
            ParkingSlot slot,
            VehicleType vehicleType,
            CreateBookingRequest request
    ) {
        if (slot.getVehicleType() == null
                || !slot.getVehicleType().getId().equals(vehicleType.getId())) {
            throw new RuntimeException("Selected slot does not support this vehicle type");
        }

        validatePhysicalSlotStatus(slot);

        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                slot.getId(),
                request.getStartTime(),
                request.getEndTime()
        );

        if (!overlappingBookings.isEmpty()) {
            throw new RuntimeException("Selected slot is already reserved in this time range");
        }
    }

    private void validatePhysicalSlotStatus(ParkingSlot slot) {
        String slotStatus = slot.getStatus() == null
                ? SLOT_STATUS_AVAILABLE
                : slot.getStatus().trim().toUpperCase();

        if (SLOT_STATUS_OCCUPIED.equals(slotStatus)) {
            throw new RuntimeException("Selected slot is currently occupied");
        }

        if (SLOT_STATUS_MAINTENANCE.equals(slotStatus)) {
            throw new RuntimeException("Selected slot is under maintenance");
        }

        if (!SLOT_STATUS_AVAILABLE.equals(slotStatus)
                && !SLOT_STATUS_RESERVED.equals(slotStatus)) {
            throw new RuntimeException("Selected slot is not available for booking");
        }
    }

    private String normalizeLicensePlate(String licensePlate) {
        String normalizedPlate = licensePlate == null ? "" : licensePlate.trim().toUpperCase();

        if (normalizedPlate.isEmpty()) {
            throw new RuntimeException("License plate cannot be empty");
        }

        return normalizedPlate;
    }

    private String normalizeNullableText(String value) {
        if (value == null) {
            return null;
        }

        String normalizedValue = value.trim();

        return normalizedValue.isEmpty() ? null : normalizedValue;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return Booking.STATUS_PENDING_PAYMENT;
        }

        String normalizedStatus = status.trim().toUpperCase();

        if ("PENDING".equals(normalizedStatus)) {
            return Booking.STATUS_PENDING_PAYMENT;
        }

        if ("CANCELED".equals(normalizedStatus)) {
            return Booking.STATUS_CANCELLED;
        }

        return normalizedStatus;
    }
}