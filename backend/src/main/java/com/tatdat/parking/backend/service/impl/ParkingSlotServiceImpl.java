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

import java.time.LocalDateTime;
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
        return sortSlotsByFloorAndCode(parkingSlotRepository.findAll());
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
        return sortSlotsByFloorAndCode(
                parkingSlotRepository.findByStatusIgnoreCase(SlotStatus.AVAILABLE.name())
        );
    }

    @Override
    public long countAvailableSlots() {
        return parkingSlotRepository.countByStatusIgnoreCase(SlotStatus.AVAILABLE.name());
    }

    @Override
    public List<ParkingSlot> getAvailableSlotsByVehicleType(Integer vehicleTypeId) {
        return sortSlotsByFloorAndCode(
                parkingSlotRepository.findByVehicleType_IdAndStatusIgnoreCase(
                        vehicleTypeId,
                        SlotStatus.AVAILABLE.name()
                )
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getAvailableSlotsForBooking(
            Integer vehicleTypeId,
            LocalDateTime startTime,
            LocalDateTime endTime
    ) {
        validateAvailableForBookingRequest(vehicleTypeId, null, startTime, endTime);

        return sortSlotsByFloorAndCode(
                parkingSlotRepository.findBookableSlotsByVehicleType(
                        vehicleTypeId,
                        startTime,
                        endTime
                )
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getAvailableSlotsForBookingByFloor(
            Integer vehicleTypeId,
            Integer floorId,
            LocalDateTime startTime,
            LocalDateTime endTime
    ) {
        validateAvailableForBookingRequest(vehicleTypeId, floorId, startTime, endTime);

        return sortSlotsByFloorAndCode(
                parkingSlotRepository.findBookableSlotsByVehicleTypeAndFloor(
                        vehicleTypeId,
                        floorId,
                        startTime,
                        endTime
                )
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
        validateBulkCreateRequest(request);

        ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking floor not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        ParkingZone zone = getOrCreateDefaultZone(floor);

        /*
         * Slot code must be consistent with the Parking Floor screen.
         *
         * Example:
         * Floor 1:
         *   A-01 ... A-60 = Car
         *   A-61 ... A-70 = Motorbike
         *
         * Therefore the prefix depends on the floor, not on vehicle type.
         */
        String prefix = buildSlotPrefix(floor.getFloorName());

        List<ParkingSlot> existingSlots = parkingSlotRepository.findByZone_Floor_Id(floor.getId())
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
                .message("Created " + request.getQuantity() + " " + vehicleType.getTypeName()
                        + " slots in " + floor.getFloorName() + " successfully")
                .build();
    }

    @Override
    @Transactional
    public BulkDeleteParkingSlotResponse bulkDeleteSlots(BulkDeleteParkingSlotRequest request) {
        validateBulkDeleteRequest(request);

        ParkingFloor floor = parkingFloorRepository.findById(request.getFloorId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking floor not found"));

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle type not found"));

        List<ParkingSlot> availableSlots = parkingSlotRepository
                .findByZone_Floor_IdAndVehicleType_IdAndStatusIgnoreCase(
                        floor.getId(),
                        vehicleType.getId(),
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
                .message("Deleted " + deletableSlots.size() + " " + vehicleType.getTypeName()
                        + " slots from " + floor.getFloorName() + " successfully")
                .build();
    }

    private void validateBulkCreateRequest(BulkCreateParkingSlotRequest request) {
        if (request == null) {
            throw new RuntimeException("Request body is required");
        }

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
    }

    private void validateBulkDeleteRequest(BulkDeleteParkingSlotRequest request) {
        if (request == null) {
            throw new RuntimeException("Request body is required");
        }

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
    }

    private void validateAvailableForBookingRequest(
            Integer vehicleTypeId,
            Integer floorId,
            LocalDateTime startTime,
            LocalDateTime endTime
    ) {
        if (vehicleTypeId == null) {
            throw new RuntimeException("Vehicle type ID is required");
        }

        if (floorId != null && floorId <= 0) {
            throw new RuntimeException("Floor ID is invalid");
        }

        if (startTime == null) {
            throw new RuntimeException("Start time is required");
        }

        if (endTime == null) {
            throw new RuntimeException("End time is required");
        }

        if (!endTime.isAfter(startTime)) {
            throw new RuntimeException("End time must be after start time");
        }

        if (startTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Start time must be in the future");
        }
    }

    private ParkingZone getOrCreateDefaultZone(ParkingFloor floor) {
        return parkingZoneRepository.findFirstByFloorIdOrderByIdAsc(floor.getId())
                .orElseGet(() -> {
                    ParkingZone zone = new ParkingZone();
                    zone.setFloor(floor);
                    zone.setZoneName("Default Zone");
                    return parkingZoneRepository.save(zone);
                });
    }

    private String buildSlotPrefix(String floorName) {
        String normalizedFloorName = floorName == null
                ? ""
                : floorName.trim().toUpperCase();

        if (normalizedFloorName.equals("G")
                || normalizedFloorName.equals("GROUND")
                || normalizedFloorName.equals("FLOOR G")) {
            return "G";
        }

        if (normalizedFloorName.equals("1")
                || normalizedFloorName.equals("A")
                || normalizedFloorName.equals("A1")
                || normalizedFloorName.equals("F1")
                || normalizedFloorName.equals("FLOOR 1")
                || normalizedFloorName.equals("FLOOR A")
                || normalizedFloorName.equals("FLOOR A1")) {
            return "A";
        }

        if (normalizedFloorName.equals("2")
                || normalizedFloorName.equals("C")
                || normalizedFloorName.equals("A2")
                || normalizedFloorName.equals("F2")
                || normalizedFloorName.equals("FLOOR 2")
                || normalizedFloorName.equals("FLOOR C")
                || normalizedFloorName.equals("FLOOR A2")) {
            return "C";
        }

        String floorPart = normalizedFloorName
                .replace("FLOOR", "")
                .replaceAll("[^A-Z0-9]", "");

        if (floorPart.isBlank()) {
            return "S";
        }

        return floorPart;
    }

    private List<ParkingSlot> sortSlotsByFloorAndCode(List<ParkingSlot> slots) {
        return slots.stream()
                .sorted(this::compareSlotsByFloorAndCode)
                .toList();
    }

    private int compareSlotsByFloorAndCode(ParkingSlot slotA, ParkingSlot slotB) {
        int floorCompare = Integer.compare(
                getFloorSortValue(slotA),
                getFloorSortValue(slotB)
        );

        if (floorCompare != 0) {
            return floorCompare;
        }

        int numberCompare = Integer.compare(
                extractLastNumber(slotA == null ? null : slotA.getSlotCode()),
                extractLastNumber(slotB == null ? null : slotB.getSlotCode())
        );

        if (numberCompare != 0) {
            return numberCompare;
        }

        return safeString(slotA == null ? null : slotA.getSlotCode())
                .compareToIgnoreCase(safeString(slotB == null ? null : slotB.getSlotCode()));
    }

    private int getFloorSortValue(ParkingSlot slot) {
        if (slot == null
                || slot.getZone() == null
                || slot.getZone().getFloor() == null
                || slot.getZone().getFloor().getId() == null) {
            return Integer.MAX_VALUE;
        }

        return slot.getZone().getFloor().getId();
    }

    private String safeString(String value) {
        return value == null ? "" : value;
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