package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.LostTicketDTO;
import com.tatdat.parking.backend.dto.ManualFeeAdjustmentDTO;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.ParkingException;

public interface ExceptionService {
    ParkingException handleLostTicket(LostTicketDTO dto);
    ParkingException handleWrongVehicleInfo(Integer bookingId, UpdateBookingVehicleDTO dto);
    ParkingException handleManualFeeAdjustment(ManualFeeAdjustmentDTO dto);
}