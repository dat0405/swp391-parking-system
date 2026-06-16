package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.ParkingSession;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.service.FeeCalculatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class FeeCalculatorServiceImpl implements FeeCalculatorService {

    private final BookingRepository bookingRepository;

    private static final Set<LocalDate> HOLIDAYS = Set.of(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 4, 30),
            LocalDate.of(2025, 5, 1),
            LocalDate.of(2025, 9, 2)
    );

    @Override
    public BigDecimal calculate(ParkingSession session,
                                PricingPolicy policy,
                                LocalDateTime checkOutTime) {

        LocalDateTime checkIn = session.getCheckInTime();

        // Tổng số giờ thực tế (tối thiểu 1 giờ)
        long actualHours = (long) Math.ceil(
                Duration.between(
                        checkIn,
                        checkOutTime
                ).toMinutes() / 60.0
        );

        if (actualHours < 1) {
            actualHours = 1;
        }

        // Phí cơ bản
        BigDecimal total = policy.getPricePerHour()
                .multiply(BigDecimal.valueOf(actualHours));

        // Multiplier: ngày lễ ưu tiên hơn cuối tuần
        LocalDate checkInDate = checkIn.toLocalDate();
        if (HOLIDAYS.contains(checkInDate)) {
            BigDecimal mul = policy.getHolidayMultiplier() != null
                    ? policy.getHolidayMultiplier() : new BigDecimal("2.0");
            total = total.multiply(mul);
        } else if (isWeekend(checkInDate)) {
            BigDecimal mul = policy.getWeekendMultiplier() != null
                    ? policy.getWeekendMultiplier() : new BigDecimal("1.5");
            total = total.multiply(mul);
        }

        // Tìm booking tương ứng
        Booking booking = bookingRepository
                .findByVehicleIdAndSlotId(
                        session.getVehicle().getId(),
                        session.getSlot().getId())
                .orElse(null);

        if (booking != null && booking.getBookingTime() != null
                && booking.getStartTime() != null) {

            // ✅ Giảm 10% nếu đặt trước >= 3 tiếng so với giờ bắt đầu đỗ
            long hoursBookedAhead = ChronoUnit.HOURS.between(
                    booking.getBookingTime(), booking.getStartTime());
            if (hoursBookedAhead >= 3) {
                total = total.multiply(new BigDecimal("0.9"));
            }

            // Phí quá giờ: +10.000đ/giờ (flat, không nhân multiplier)
            if (booking.getEndTime() != null
                    && checkOutTime.isAfter(booking.getEndTime())) {
                long overtimeHours = ChronoUnit.HOURS.between(
                        booking.getEndTime(), checkOutTime);
                if (overtimeHours > 0) {
                    total = total.add(
                            new BigDecimal("10000")
                                    .multiply(BigDecimal.valueOf(overtimeHours)));
                }
            }
        }

        return total.setScale(0, RoundingMode.HALF_UP);
    }

    private boolean isWeekend(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }
}