package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PutMapping("/{id}/edit-vehicle")
    public ResponseEntity<Booking> updateVehicle(
            @PathVariable Integer id,
            @RequestBody UpdateBookingVehicleDTO dto
    ) {
        return ResponseEntity.ok(bookingService.updateVehicleInfo(id, dto));
    }
}