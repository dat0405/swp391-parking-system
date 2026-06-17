package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.CreateBookingDTO;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;

import java.util.List;

public interface BookingService {
    Booking updateVehicleInfo(Integer bookingId, UpdateBookingVehicleDTO dto);
    Booking createBooking(CreateBookingDTO dto);
    Booking cancelBooking(Integer bookingId);
    List<Booking> getBookingHistoryByUser(Integer userId);
}