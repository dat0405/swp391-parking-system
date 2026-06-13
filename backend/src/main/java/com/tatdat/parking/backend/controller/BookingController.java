package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.BookingResponse;
import com.tatdat.parking.backend.dto.CreateBookingRequest;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Integer id) {
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody CreateBookingRequest request
    ) {
        BookingResponse createdBooking = bookingService.createBooking(request);

        return ResponseEntity
                .created(URI.create("/api/bookings/" + createdBooking.getId()))
                .body(createdBooking);
    }

    @PutMapping("/{id}/edit-vehicle")
    public ResponseEntity<BookingResponse> updateVehicle(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateBookingVehicleDTO dto
    ) {
        return ResponseEntity.ok(bookingService.updateVehicleInfo(id, dto));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<BookingResponse> confirmBooking(@PathVariable Integer id) {
        return ResponseEntity.ok(bookingService.confirmBooking(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable Integer id) {
        return ResponseEntity.ok(bookingService.cancelBooking(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Integer id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }
}