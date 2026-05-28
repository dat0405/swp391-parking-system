package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.ParkingSlotRequest;
import com.tatdat.parking.backend.entity.ParkingSlot;

import java.util.List;

public interface ParkingSlotService {

    List<ParkingSlot> getAllSlots();

    ParkingSlot getSlotById(Integer id);

    ParkingSlot createSlot(ParkingSlotRequest request);

    ParkingSlot updateSlot(Integer id,
                           ParkingSlotRequest request);

    void deleteSlot(Integer id);

    ParkingSlot updateStatus(Integer id,
                             String status);

    List<ParkingSlot> getAvailableSlots();

    long countAvailableSlots();

    List<ParkingSlot> getAvailableSlotsByVehicleType(
            Integer vehicleTypeId
    );

    ParkingSlot setMaintenance(Integer id);

    ParkingSlot disableMaintenance(Integer id);
}