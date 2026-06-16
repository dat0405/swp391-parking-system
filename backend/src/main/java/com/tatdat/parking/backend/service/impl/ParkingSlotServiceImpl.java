package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.BulkCreateParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkCreateParkingSlotResponse;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotResponse;
import com.tatdat.parking.backend.dto.ParkingSlotRequest;
import com.tatdat.parking.backend.entity.ParkingFloor;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.ParkingZone;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.enums.SlotStatus;
import com.tatdat.parking.backend.exception.ResourceNotFoundException;
import com.tatdat.parking.backend.repository.ParkingFloorRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.ParkingZoneRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.ParkingSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingSlotServiceImpl implements ParkingSlotService {

    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingZoneRepository parkingZoneRepository;
    private final ParkingFloorRepository parkingFloorRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final VehicleTypeRepository vehicleTypeRepository;

    @Override
    public List<ParkingSlot> getAllSlots() {
        return parkingSlotRepository.findAll();
    }

    @Override
    public ParkingSlot getSlotById(Integer id) {
        return parkingSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parking slot not found"));
    }

    @Override
    public ParkingSlot createSlot(ParkingSlotRequest request) {
        ParkingZone zone = parkingZoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        ParkingSlot slot = new ParkingSlot();

        slot.setZone(zone);
        slot.setVehicleType(vehicleType);
        slot.setSlotCode(normalizeSlotCode(request.getSlotCode()));
        slot.setStatus(normalizeStatus(request.getStatus(), SlotStatus.AVAILABLE.name()));

        return parkingSlotRepository.save(slot);
    }

    @Override
    public ParkingSlot updateSlot(Integer id, ParkingSlotRequest request) {
        ParkingSlot slot = getSlotById(id);

        ParkingZone zone = parkingZoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        slot.setZone(zone);
        slot.setVehicleType(vehicleType);
        slot.setSlotCode(normalizeSlotCode(request.getSlotCode()));
        slot.setStatus(normalizeStatus(request.getStatus(), SlotStatus.AVAILABLE.name()));

        return parkingSlotRepository.save(slot);
    }

    @Override
    public void deleteSlot(Integer id) {
        ParkingSlot slot = getSlotById(id);

        if (parkingSessionRepository.existsBySlot_Id(slot.getId())) {
            throw new RuntimeException("Cannot delete this slot because it already has parking session history");
        }

        if (!SlotStatus.AVAILABLE.name().equalsIgnoreCase(slot.getStatus())) {
            throw new RuntimeException("Only AVAILABLE slots can be deleted");
        }

        parkingSlotRepository.delete(slot);
    }

    @Override
    public ParkingSlot updateStatus(Integer id, String status) {
        ParkingSlot slot = getSlotById(id);
        slot.setStatus(normalizeStatus(status, SlotStatus.AVAILABLE.name()));

        return parkingSlotRepository.save(slot);
    }

    @Override
    public List<ParkingSlot> getAvailableSlots() {
        return parkingSlotRepository.findByStatusIgnoreCase(SlotStatus.AVAILABLE.name());
    }

    @Override
    public long countAvailableSlots() {
        return parkingSlotRepository.countByStatusIgnoreCase(SlotStatus.AVAILABLE.name());
    }

    @Override
    public List<ParkingSlot> getAvailableSlotsByVehicleType(Integer vehicleTypeId) {
        return parkingSlotRepository.findByVehicleType_IdAndStatusIgnoreCase(
                vehicleTypeId,
                SlotStatus.AVAILABLE.name()
        );
    }

    @Override
    public ParkingSlot setMaintenance(Integer id) {
        ParkingSlot slot = getSlotById(id);
        slot.setStatus(SlotStatus.MAINTENANCE.name());

        return parkingSlotRepository.save(slot);
    }

    @Override
    public ParkingSlot disableMaintenance(Integer id) {
        ParkingSlot slot = getSlotById(id);
        slot.setStatus(SlotStatus.AVAILABLE.name());

        return parkingSlotRepository.save(slot);
    }

    @Override
    @Transactional
    public BulkCreateParkingSlotResponse bulkCreateSlots(BulkCreateParkingSlotRequest request) {
        if (request.getFloorId() == null) {
            throw new RuntimeException("Floor is required");
        }

        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        if (request.getQuantity() > 500) {
            throw new RuntimeException("Quantity is too large. Maximum is 500 slots per request");
        }

        ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking floor not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        validateVehicleTypeForFloor(floor, vehicleType);

        ParkingZone zone = getOrCreateDefaultZone(floor);

        String prefix = buildSlotPrefix(floor.getFloorName(), vehicleType.getTypeName());

        List<ParkingSlot> existingSlots = parkingSlotRepository.findAll()
                .stream()
                .filter(slot -> slot.getSlotCode() != null)
                .filter(slot -> slot.getSlotCode().toUpperCase().startsWith(prefix + "-"))
                .toList();

        int lastNumber = existingSlots.stream()
                .map(ParkingSlot::getSlotCode)
                .map(this::extractLastNumber)
                .max(Comparator.naturalOrder())
                .orElse(0);

        for (int i = 1; i <= request.getQuantity(); i++) {
            int nextNumber = lastNumber + i;

            ParkingSlot slot = new ParkingSlot();
            slot.setZone(zone);
            slot.setVehicleType(vehicleType);
            slot.setSlotCode(prefix + "-" + String.format("%02d", nextNumber));
            slot.setStatus(SlotStatus.AVAILABLE.name());

            parkingSlotRepository.save(slot);
        }

        return BulkCreateParkingSlotResponse.builder()
                .createdCount(request.getQuantity())
                .floorId(floor.getId())
                .floorName(floor.getFloorName())
                .vehicleTypeId(vehicleType.getId())
                .vehicleTypeName(vehicleType.getTypeName())
                .message("Created " + request.getQuantity() + " parking slots successfully")
                .build();
    }

    @Override
    @Transactional
    public BulkDeleteParkingSlotResponse bulkDeleteSlots(BulkDeleteParkingSlotRequest request) {
        if (request.getFloorId() == null) {
            throw new RuntimeException("Floor is required");
        }

        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking floor not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        List<ParkingSlot> availableSlots = parkingSlotRepository
                .findByZone_Floor_IdAndVehicleType_IdAndStatusIgnoreCase(
                        request.getFloorId(),
                        request.getVehicleTypeId(),
                        SlotStatus.AVAILABLE.name()
                );

        List<ParkingSlot> deletableSlots = availableSlots.stream()
                .filter(slot -> !parkingSessionRepository.existsBySlot_Id(slot.getId()))
                .sorted((slotA, slotB) -> {
                    int numberA = extractLastNumber(slotA.getSlotCode());
                    int numberB = extractLastNumber(slotB.getSlotCode());

                    return Integer.compare(numberB, numberA);
                })
                .limit(request.getQuantity())
                .toList();

        if (deletableSlots.isEmpty()) {
            return BulkDeleteParkingSlotResponse.builder()
                    .deletedCount(0)
                    .requestedQuantity(request.getQuantity())
                    .floorId(floor.getId())
                    .floorName(floor.getFloorName())
                    .vehicleTypeId(vehicleType.getId())
                    .vehicleTypeName(vehicleType.getTypeName())
                    .message("No deletable slots found. Only AVAILABLE slots without parking sessions can be deleted")
                    .build();
        }

        parkingSlotRepository.deleteAll(deletableSlots);

        return BulkDeleteParkingSlotResponse.builder()
                .deletedCount(deletableSlots.size())
                .requestedQuantity(request.getQuantity())
                .floorId(floor.getId())
                .floorName(floor.getFloorName())
                .vehicleTypeId(vehicleType.getId())
                .vehicleTypeName(vehicleType.getTypeName())
                .message("Deleted " + deletableSlots.size() + " parking slots successfully")
                .build();
    }

    private ParkingZone getOrCreateDefaultZone(ParkingFloor floor) {
        List<ParkingZone> zones = parkingZoneRepository.findByFloorId(floor.getId());

        if (!zones.isEmpty()) {
            return zones.get(0);
        }

        ParkingZone zone = new ParkingZone();
        zone.setFloor(floor);
        zone.setZoneName("Zone " + floor.getFloorName());

        return parkingZoneRepository.save(zone);
    }

    private void validateVehicleTypeForFloor(ParkingFloor floor, VehicleType vehicleType) {
        String floorName = floor.getFloorName() == null
                ? ""
                : floor.getFloorName().trim().toUpperCase();

        String typeName = vehicleType.getTypeName() == null
                ? ""
                : vehicleType.getTypeName().trim().toLowerCase();

        boolean isMotorbike = typeName.contains("motor") || typeName.contains("bike") || typeName.contains("xe");
        boolean isCar = typeName.contains("car") || typeName.contains("oto") || typeName.contains("ô tô");

        boolean isGroundFloor = floorName.equals("G")
                || floorName.equals("FLOOR G")
                || floorName.equals("GROUND");

        if (isGroundFloor && !isMotorbike) {
            throw new RuntimeException("Floor G is only for motorbike slots");
        }

        if (!isGroundFloor && !isCar) {
            throw new RuntimeException("This floor is only for car slots");
        }
    }

    private String buildSlotPrefix(String floorName, String vehicleTypeName) {
        String floorPart = floorName == null ? "" : floorName;

        floorPart = floorPart
                .trim()
                .toUpperCase()
                .replace("FLOOR", "")
                .replaceAll("[^A-Z0-9]", "");

        if (floorPart.isBlank()) {
            floorPart = "F";
        }

        String typePart = vehicleTypeName == null ? "" : vehicleTypeName.trim().toLowerCase();

        if (typePart.contains("motor") || typePart.contains("bike") || typePart.contains("xe")) {
            return floorPart + "-BIKE";
        }

        return floorPart + "-CAR";
    }

    private int extractLastNumber(String slotCode) {
        if (slotCode == null || slotCode.isBlank()) {
            return 0;
        }

        String[] parts = slotCode.split("-");

        if (parts.length == 0) {
            return 0;
        }

        String lastPart = parts[parts.length - 1].replaceAll("[^0-9]", "");

        if (lastPart.isBlank()) {
            return 0;
        }

        try {
            return Integer.parseInt(lastPart);
        } catch (NumberFormatException exception) {
            return 0;
        }
    }

    private String normalizeSlotCode(String slotCode) {
        if (slotCode == null || slotCode.isBlank()) {
            throw new RuntimeException("Slot code is required");
        }

        return slotCode.trim().toUpperCase();
    }

    private String normalizeStatus(String status, String defaultStatus) {
        if (status == null || status.isBlank()) {
            return defaultStatus;
        }

        return status.trim().toUpperCase();
    }
}