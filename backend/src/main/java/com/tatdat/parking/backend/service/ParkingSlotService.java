package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.BulkCreateParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkCreateParkingSlotResponse;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotRequest;
import com.tatdat.parking.backend.dto.BulkDeleteParkingSlotResponse;
import com.tatdat.parking.backend.dto.ParkingSlotRequest;
import com.tatdat.parking.backend.entity.ParkingSlot;

import java.time.LocalDateTime;
import java.util.List;

public interface ParkingSlotService {

    List<ParkingSlot> getAllSlots();

    ParkingSlot getSlotById(Integer id);

    ParkingSlot createSlot(ParkingSlotRequest request);

    ParkingSlot updateSlot(Integer id, ParkingSlotRequest request);

    void deleteSlot(Integer id);

    ParkingSlot updateStatus(Integer id, String status);

    List<ParkingSlot> getAvailableSlots();

    long countAvailableSlots();

    List<ParkingSlot> getAvailableSlotsByVehicleType(Integer vehicleTypeId);

    List<ParkingSlot> getAvailableSlotsForBooking(
            Integer vehicleTypeId,
            LocalDateTime startTime,
            LocalDateTime endTime
    );

    List<ParkingSlot> getAvailableSlotsForBookingByFloor(
            Integer vehicleTypeId,
            Integer floorId,
            LocalDateTime startTime,
            LocalDateTime endTime
    );

    ParkingSlot setMaintenance(Integer id);

    ParkingSlot disableMaintenance(Integer id);

    BulkCreateParkingSlotResponse bulkCreateSlots(BulkCreateParkingSlotRequest request);

    BulkDeleteParkingSlotResponse bulkDeleteSlots(BulkDeleteParkingSlotRequest request);
}