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

    private static final String SLOT_STATUS_AVAILABLE = "AVAILABLE";
    private static final String SLOT_STATUS_RESERVED = "RESERVED";

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

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .slot(slot)
                .bookingTime(LocalDateTime.now())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(Booking.STATUS_PENDING)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        if (SLOT_STATUS_AVAILABLE.equalsIgnoreCase(slot.getStatus())) {
            slot.setStatus(SLOT_STATUS_RESERVED);
            parkingSlotRepository.save(slot);
        }

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

        if (Booking.STATUS_CANCELLED.equalsIgnoreCase(booking.getStatus())) {
            throw new RuntimeException("Cancelled booking cannot be confirmed");
        }

        if (Booking.STATUS_COMPLETED.equalsIgnoreCase(booking.getStatus())) {
            throw new RuntimeException("Completed booking cannot be confirmed again");
        }

        booking.setStatus(Booking.STATUS_CONFIRMED);

        Booking savedBooking = bookingRepository.save(booking);

        ParkingSlot slot = savedBooking.getSlot();

        if (slot != null && SLOT_STATUS_AVAILABLE.equalsIgnoreCase(slot.getStatus())) {
            slot.setStatus(SLOT_STATUS_RESERVED);
            parkingSlotRepository.save(slot);
        }

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);

        if (Booking.STATUS_COMPLETED.equalsIgnoreCase(booking.getStatus())) {
            throw new RuntimeException("Completed booking cannot be cancelled");
        }

        booking.setStatus(Booking.STATUS_CANCELLED);

        Booking savedBooking = bookingRepository.save(booking);

        releaseSlotIfNoActiveBooking(savedBooking.getSlot());

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public void deleteBooking(Integer bookingId) {
        Booking booking = findBookingOrThrow(bookingId);
        ParkingSlot slot = booking.getSlot();

        bookingRepository.delete(booking);

        releaseSlotIfNoActiveBooking(slot);
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

        if (slot.getStatus() != null
                && !SLOT_STATUS_AVAILABLE.equalsIgnoreCase(slot.getStatus())
                && !SLOT_STATUS_RESERVED.equalsIgnoreCase(slot.getStatus())) {
            throw new RuntimeException("Selected slot is not available for booking");
        }

        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                slot.getId(),
                request.getStartTime(),
                request.getEndTime()
        );

        if (!overlappingBookings.isEmpty()) {
            throw new RuntimeException("Selected slot is already reserved in this time range");
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

    private void releaseSlotIfNoActiveBooking(ParkingSlot slot) {
        if (slot == null) {
            return;
        }

        List<Booking> activeBookings = bookingRepository.findByStatusOrderByBookingTimeDesc(Booking.STATUS_PENDING)
                .stream()
                .filter(booking -> booking.getSlot() != null && booking.getSlot().getId().equals(slot.getId()))
                .toList();

        if (activeBookings.isEmpty()) {
            activeBookings = bookingRepository.findByStatusOrderByBookingTimeDesc(Booking.STATUS_CONFIRMED)
                    .stream()
                    .filter(booking -> booking.getSlot() != null && booking.getSlot().getId().equals(slot.getId()))
                    .toList();
        }

        if (activeBookings.isEmpty()) {
            slot.setStatus(SLOT_STATUS_AVAILABLE);
            parkingSlotRepository.save(slot);
        }
    }
}