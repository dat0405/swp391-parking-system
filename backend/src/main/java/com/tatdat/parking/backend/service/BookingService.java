package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.BookingHistoryResponse;
import com.tatdat.parking.backend.dto.BookingResponse;
import com.tatdat.parking.backend.dto.CreateBookingRequest;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;

import java.util.List;
import java.util.Optional;

public interface BookingService {

    List<BookingResponse> getAllBookings();

    BookingResponse getBookingById(Integer bookingId);

    List<BookingHistoryResponse> getMyBookingHistory();

    BookingHistoryResponse getMyBookingHistoryDetail(Integer bookingId);

    Optional<BookingHistoryResponse> getMyPendingPayment();

    BookingHistoryResponse cancelMyBooking(Integer bookingId);

    BookingResponse createBooking(CreateBookingRequest request);

    BookingResponse updateVehicleInfo(
            Integer bookingId,
            UpdateBookingVehicleDTO dto
    );

    BookingResponse confirmBooking(Integer bookingId);

    BookingResponse cancelBooking(Integer bookingId);

    int cancelExpiredPendingPayments();

    void deleteBooking(Integer bookingId);
}
