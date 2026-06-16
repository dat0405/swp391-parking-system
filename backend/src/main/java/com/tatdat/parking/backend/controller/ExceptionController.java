package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.*;
import com.tatdat.parking.backend.entity.ParkingException;
import com.tatdat.parking.backend.service.ExceptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exceptions")
@RequiredArgsConstructor
public class ExceptionController {

    private final ExceptionService exceptionService;

    // POST /api/exceptions/lost-ticket
    @PostMapping("/lost-ticket")
    public ResponseEntity<ParkingException> lostTicket(
            @RequestBody LostTicketDTO dto) {
        return ResponseEntity.ok(exceptionService.handleLostTicket(dto));
    }

    // PUT /api/exceptions/wrong-vehicle/{bookingId}
    @PutMapping("/wrong-vehicle/{bookingId}")
    public ResponseEntity<ParkingException> wrongVehicle(
            @PathVariable Integer bookingId,
            @RequestBody UpdateBookingVehicleDTO dto) {
        return ResponseEntity.ok(exceptionService.handleWrongVehicleInfo(bookingId, dto));
    }

    // POST /api/exceptions/manual-fee
    @PostMapping("/manual-fee")
    public ResponseEntity<ParkingException> manualFee(
            @RequestBody ManualFeeAdjustmentDTO dto) {
        return ResponseEntity.ok(exceptionService.handleManualFeeAdjustment(dto));
    }
}