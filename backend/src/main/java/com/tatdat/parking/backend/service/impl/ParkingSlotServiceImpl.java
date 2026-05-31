package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.ParkingSlotRequest;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.ParkingZone;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.enums.SlotStatus;
import com.tatdat.parking.backend.exception.ResourceNotFoundException;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.ParkingZoneRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.ParkingSlotService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParkingSlotServiceImpl
        implements ParkingSlotService {

    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingZoneRepository parkingZoneRepository;
    private final VehicleTypeRepository vehicleTypeRepository;

    public ParkingSlotServiceImpl(
            ParkingSlotRepository parkingSlotRepository,
            ParkingZoneRepository parkingZoneRepository,
            VehicleTypeRepository vehicleTypeRepository
    ) {
        this.parkingSlotRepository = parkingSlotRepository;
        this.parkingZoneRepository = parkingZoneRepository;
        this.vehicleTypeRepository = vehicleTypeRepository;
    }

    @Override
    public List<ParkingSlot> getAllSlots() {
        return parkingSlotRepository.findAll();
    }

    @Override
    public ParkingSlot getSlotById(Integer id) {

        return parkingSlotRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Parking slot not found"
                        ));
    }

    @Override
    public ParkingSlot createSlot(
            ParkingSlotRequest request
    ) {

        ParkingZone zone =
                parkingZoneRepository.findById(
                        request.getZoneId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Zone not found"
                        ));

        VehicleType vehicleType =
                vehicleTypeRepository.findById(
                        request.getVehicleTypeId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Vehicle type not found"
                        ));

        ParkingSlot slot = new ParkingSlot();

        slot.setZone(zone);
        slot.setVehicleType(vehicleType);
        slot.setSlotCode(request.getSlotCode());

        if (request.getStatus() == null ||
                request.getStatus().isEmpty()) {

            slot.setStatus(
                    SlotStatus.AVAILABLE.name()
            );

        } else {

            slot.setStatus(request.getStatus());
        }

        return parkingSlotRepository.save(slot);
    }

    @Override
    public ParkingSlot updateSlot(
            Integer id,
            ParkingSlotRequest request
    ) {

        ParkingSlot slot = getSlotById(id);

        ParkingZone zone =
                parkingZoneRepository.findById(
                        request.getZoneId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Zone not found"
                        ));

        VehicleType vehicleType =
                vehicleTypeRepository.findById(
                        request.getVehicleTypeId()
                ).orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Vehicle type not found"
                        ));

        slot.setZone(zone);
        slot.setVehicleType(vehicleType);
        slot.setSlotCode(request.getSlotCode());
        slot.setStatus(request.getStatus());

        return parkingSlotRepository.save(slot);
    }

    @Override
    public void deleteSlot(Integer id) {

        ParkingSlot slot = getSlotById(id);

        parkingSlotRepository.delete(slot);
    }

    @Override
    public ParkingSlot updateStatus(
            Integer id,
            String status
    ) {

        ParkingSlot slot = getSlotById(id);

        slot.setStatus(status);

        return parkingSlotRepository.save(slot);
    }

    @Override
    public List<ParkingSlot> getAvailableSlots() {

        return parkingSlotRepository.findByStatus(
                SlotStatus.AVAILABLE.name()
        );
    }

    @Override
    public long countAvailableSlots() {

        return parkingSlotRepository.countByStatus(
                SlotStatus.AVAILABLE.name()
        );
    }

    @Override
    public List<ParkingSlot>
    getAvailableSlotsByVehicleType(
            Integer vehicleTypeId
    ) {

        return parkingSlotRepository
                .findByVehicleTypeIdAndStatus(
                        vehicleTypeId,
                        SlotStatus.AVAILABLE.name()
                );
    }

    @Override
    public ParkingSlot setMaintenance(
            Integer id
    ) {

        ParkingSlot slot = getSlotById(id);

        slot.setStatus(
                SlotStatus.MAINTENANCE.name()
        );

        return parkingSlotRepository.save(slot);
    }

    @Override
    public ParkingSlot disableMaintenance(
            Integer id
    ) {

        ParkingSlot slot = getSlotById(id);

        slot.setStatus(
                SlotStatus.AVAILABLE.name()
        );

        return parkingSlotRepository.save(slot);
    }
}