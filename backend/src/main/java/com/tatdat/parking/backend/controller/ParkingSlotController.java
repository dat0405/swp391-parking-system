package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.BulkCreateParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkCreateParkingSlotResponse;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotResponse;
import com.tatdat.parking.backend.dto.ParkingSlotRequest;
import com.tatdat.parking.backend.dto.UpdateSlotStatusRequest;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.service.ParkingSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/parking-slots")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"
        },
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.PATCH,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        },
        allowCredentials = "true"
)
public class ParkingSlotController {

    private final ParkingSlotService parkingSlotService;

    @GetMapping
    public ResponseEntity<List<ParkingSlot>> getAllSlots() {
        return ResponseEntity.ok(parkingSlotService.getAllSlots());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParkingSlot> getSlotById(@PathVariable Integer id) {
        return ResponseEntity.ok(parkingSlotService.getSlotById(id));
    }

    @PostMapping
    public ResponseEntity<ParkingSlot> createSlot(@RequestBody ParkingSlotRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(parkingSlotService.createSlot(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParkingSlot> updateSlot(
            @PathVariable Integer id,
            @RequestBody ParkingSlotRequest request
    ) {
        return ResponseEntity.ok(parkingSlotService.updateSlot(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteSlot(@PathVariable Integer id) {
        parkingSlotService.deleteSlot(id);
        return ResponseEntity.ok("Parking slot deleted successfully");
    }

    /*
     * Frontend hiện tại đang gọi PATCH /api/parking-slots/{id}/status.
     * Bản này cho phép cả PUT và PATCH để tránh lỗi mismatch method.
     */
    @RequestMapping(
            value = "/{id}/status",
            method = {
                    RequestMethod.PUT,
                    RequestMethod.PATCH
            }
    )
    public ResponseEntity<ParkingSlot> updateSlotStatus(
            @PathVariable Integer id,
            @RequestBody UpdateSlotStatusRequest request
    ) {
        return ResponseEntity.ok(
                parkingSlotService.updateStatus(id, request.getStatus())
        );
    }

    @GetMapping("/available")
    public ResponseEntity<List<ParkingSlot>> getAvailableSlots() {
        return ResponseEntity.ok(parkingSlotService.getAvailableSlots());
    }

    @GetMapping("/available/count")
    public ResponseEntity<Long> countAvailableSlots() {
        return ResponseEntity.ok(parkingSlotService.countAvailableSlots());
    }

    @GetMapping("/available/vehicle-type/{vehicleTypeId}")
    public ResponseEntity<List<ParkingSlot>> getAvailableSlotsByVehicleType(
            @PathVariable Integer vehicleTypeId
    ) {
        return ResponseEntity.ok(
                parkingSlotService.getAvailableSlotsByVehicleType(vehicleTypeId)
        );
    }

    /*
     * API mới cho Booking.
     *
     * Dùng API này để lấy slot còn trống theo đúng khung giờ user chọn.
     *
     * Example:
     * GET /api/parking-slots/available-for-booking
     *     ?vehicleTypeId=1
     *     &startTime=2026-07-02T10:00:00
     *     &endTime=2026-07-02T12:00:00
     */
    @GetMapping("/available-for-booking")
    public ResponseEntity<List<ParkingSlot>> getAvailableSlotsForBooking(
            @RequestParam Integer vehicleTypeId,
            @RequestParam(required = false) Integer floorId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime startTime,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endTime
    ) {
        if (floorId != null) {
            return ResponseEntity.ok(
                    parkingSlotService.getAvailableSlotsForBookingByFloor(
                            vehicleTypeId,
                            floorId,
                            startTime,
                            endTime
                    )
            );
        }

        return ResponseEntity.ok(
                parkingSlotService.getAvailableSlotsForBooking(
                        vehicleTypeId,
                        startTime,
                        endTime
                )
        );
    }

    @PutMapping("/{id}/maintenance")
    public ResponseEntity<ParkingSlot> setMaintenance(@PathVariable Integer id) {
        return ResponseEntity.ok(parkingSlotService.setMaintenance(id));
    }

    @PutMapping("/{id}/maintenance/disable")
    public ResponseEntity<ParkingSlot> disableMaintenance(@PathVariable Integer id) {
        return ResponseEntity.ok(parkingSlotService.disableMaintenance(id));
    }

    @PostMapping("/bulk-create")
    public ResponseEntity<BulkCreateParkingSlotResponse> bulkCreateSlots(
            @RequestBody BulkCreateParkingSlotRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(parkingSlotService.bulkCreateSlots(request));
    }

    @DeleteMapping("/bulk-delete")
    public ResponseEntity<BulkDeleteParkingSlotResponse> bulkDeleteSlots(
            @RequestBody BulkDeleteParkingSlotRequest request
    ) {
        return ResponseEntity.ok(parkingSlotService.bulkDeleteSlots(request));
    }
}