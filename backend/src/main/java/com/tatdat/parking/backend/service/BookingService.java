package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.BookingResponse;
import com.tatdat.parking.backend.dto.CreateBookingRequest;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;

import java.util.List;

public interface BookingService {

    List<BookingResponse> getAllBookings();

    BookingResponse getBookingById(Integer bookingId);

    BookingResponse createBooking(CreateBookingRequest request);

    BookingResponse updateVehicleInfo(Integer bookingId, UpdateBookingVehicleDTO dto);

    BookingResponse confirmBooking(Integer bookingId);

    BookingResponse cancelBooking(Integer bookingId);

    void deleteBooking(Integer bookingId);
}