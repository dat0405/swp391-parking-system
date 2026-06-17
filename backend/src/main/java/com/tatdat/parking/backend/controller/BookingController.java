package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreateBookingDTO;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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
    @PostMapping
    public ResponseEntity<Booking> createBooking(
            @RequestBody CreateBookingDTO dto
    ) {
        return ResponseEntity.ok(
                bookingService.createBooking(dto)
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable Integer id) {
        return ResponseEntity.ok(bookingService.cancelBooking(id));
    }

    @GetMapping("/user/{userId}/history")
    public ResponseEntity<List<Booking>> getBookingHistory(@PathVariable Integer userId) {
        return ResponseEntity.ok(bookingService.getBookingHistoryByUser(userId));
    }
}