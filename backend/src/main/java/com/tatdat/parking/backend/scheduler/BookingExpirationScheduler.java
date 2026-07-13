package com.tatdat.parking.backend.scheduler;

import com.tatdat.parking.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingExpirationScheduler {

    private final BookingService bookingService;

    /*
     * Runs every 5 seconds.
     * A booking is automatically changed from:
     * PENDING_PAYMENT + PENDING
     * to:
     * CANCELLED + EXPIRED
     * when paymentExpiredAt is reached.
     */
    @Scheduled(fixedDelay = 5000)
    public void cancelExpiredPendingPayments() {
        bookingService.cancelExpiredPendingPayments();
    }
}
