package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreateParkingFloorRequest;
import com.tatdat.parking.backend.entity.ParkingFacility;
import com.tatdat.parking.backend.entity.ParkingFloor;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.ParkingZone;
import com.tatdat.parking.backend.enums.SlotStatus;
import com.tatdat.parking.backend.exception.ResourceNotFoundException;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;
import com.tatdat.parking.backend.repository.ParkingFloorRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.ParkingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-floors")
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
public class ParkingFloorController {

    private final ParkingFloorRepository parkingFloorRepository;
    private final ParkingFacilityRepository parkingFacilityRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingZoneRepository parkingZoneRepository;
    private final ParkingSessionRepository parkingSessionRepository;

    @GetMapping
    public ResponseEntity<List<ParkingFloor>> getAllParkingFloors() {
        return ResponseEntity.ok(parkingFloorRepository.findAll());
    }

    @GetMapping("/facility/{facilityId}")
    public ResponseEntity<List<ParkingFloor>> getFloorsByFacility(
            @PathVariable Integer facilityId
    ) {
        return ResponseEntity.ok(parkingFloorRepository.findByFacilityId(facilityId));
    }

    @PostMapping
    public ResponseEntity<ParkingFloor> createParkingFloor(
            @RequestBody CreateParkingFloorRequest request
    ) {
        if (request == null) {
            throw new RuntimeException("Request body is required");
        }

        if (request.getFacilityId() == null) {
            throw new RuntimeException("Facility is required");
        }

        if (request.getFloorName() == null || request.getFloorName().trim().isEmpty()) {
            throw new RuntimeException("Floor name is required");
        }

        String floorName = request.getFloorName().trim();

        ParkingFacility facility = parkingFacilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking facility not found"));

        boolean floorExists = parkingFloorRepository.existsByFacilityIdAndFloorNameIgnoreCase(
                request.getFacilityId(),
                floorName
        );

        if (floorExists) {
            throw new RuntimeException("Floor name already exists in this facility");
        }

        ParkingFloor parkingFloor = ParkingFloor.builder()
                .facility(facility)
                .floorName(floorName)
                .build();

        ParkingFloor savedFloor = parkingFloorRepository.save(parkingFloor);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedFloor);
    }

    @DeleteMapping("/{floorId}")
    public ResponseEntity<String> deleteParkingFloor(
            @PathVariable Integer floorId
    ) {
        ParkingFloor floor = parkingFloorRepository.findById(floorId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking floor not found"));

        List<ParkingSlot> slotsInFloor = parkingSlotRepository.findByZone_Floor_Id(floorId);

        for (ParkingSlot slot : slotsInFloor) {
            if (!SlotStatus.AVAILABLE.name().equalsIgnoreCase(slot.getStatus())) {
                throw new RuntimeException(
                        "Cannot delete this floor because it has slots that are not AVAILABLE"
                );
            }

            if (parkingSessionRepository.existsBySlot_Id(slot.getId())) {
                throw new RuntimeException(
                        "Cannot delete this floor because some slots already have parking session history"
                );
            }
        }

        List<ParkingZone> zonesInFloor = parkingZoneRepository.findByFloorId(floorId);

        parkingSlotRepository.deleteAll(slotsInFloor);
        parkingZoneRepository.deleteAll(zonesInFloor);
        parkingFloorRepository.delete(floor);

        return ResponseEntity.ok("Parking floor deleted successfully");
    }
}