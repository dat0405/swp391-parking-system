package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;

public interface BookingService {
    Booking updateVehicleInfo(Integer bookingId, UpdateBookingVehicleDTO dto);
}