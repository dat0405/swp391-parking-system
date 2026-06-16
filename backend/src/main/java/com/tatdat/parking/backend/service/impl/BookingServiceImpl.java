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

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

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
}