package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.BookingHistory;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.repository.BookingHistoryRepository;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.tatdat.parking.backend.dto.CreateBookingDTO;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    @Override
    public Booking updateVehicleInfo(
            Integer bookingId,
            UpdateBookingVehicleDTO dto) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new RuntimeException("Booking not found"));

        Vehicle vehicle = booking.getVehicle();

        if (vehicle == null) {
            throw new RuntimeException(
                    "Booking has no vehicle assigned");
        }

        User staff = userRepository.findById(
                        dto.getHandledByUserId())
                .orElseThrow(() ->
                        new RuntimeException("Staff not found"));

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

            String newPlate = dto.getLicensePlate().trim();

            if (newPlate.isEmpty()) {
                throw new RuntimeException(
                        "License plate cannot be empty");
            }

            vehicleRepository.findByLicensePlate(newPlate)
                    .ifPresent(existingVehicle -> {

                        if (!existingVehicle.getId()
                                .equals(vehicle.getId())) {

                            throw new RuntimeException(
                                    "License plate already exists");
                        }
                    });

            vehicle.setLicensePlate(newPlate);
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

        return booking;
    }
    @Override
    public Booking createBooking(CreateBookingDTO dto) {

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Vehicle vehicle = vehicleRepository.findById(dto.getVehicleId())
                .orElseThrow(() ->
                        new RuntimeException("Vehicle not found"));

        ParkingSlot slot = parkingSlotRepository.findById(dto.getSlotId())
                .orElseThrow(() ->
                        new RuntimeException("Slot not found"));

        if (!"AVAILABLE".equals(slot.getStatus())) {

            throw new RuntimeException(
                    "Slot is not available");
        }

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .slot(slot)
                .bookingTime(LocalDateTime.now())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .status("PENDING")
                .build();

        slot.setStatus("RESERVED");

        parkingSlotRepository.save(slot);

        return bookingRepository.save(booking);
    }

    @Override
    public Booking cancelBooking(Integer bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!"PENDING".equals(booking.getStatus())) {
            throw new RuntimeException("Only PENDING bookings can be cancelled");
        }

        booking.setStatus("CANCELLED");

        ParkingSlot slot = booking.getSlot();
        if (slot != null) {
            slot.setStatus("AVAILABLE");
            parkingSlotRepository.save(slot);
        }

        return bookingRepository.save(booking);
    }

    @Override
    public List<Booking> getBookingHistoryByUser(Integer userId) {
        return bookingRepository.findByUserIdOrderByBookingTimeDesc(userId);
    }
}