package com.tatdat.parking.backend.dto;

import com.tatdat.parking.backend.entity.Booking;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingHistoryResponse {

    private Integer id;
    private String bookingCode;

    private Integer userId;
    private String customerName;
    private String customerEmail;

    private Integer vehicleId;
    private String licensePlate;
    private String vehicleColor;

    private Integer vehicleTypeId;
    private String vehicleTypeName;

    private Integer slotId;
    private String slotCode;

    private Integer floorId;
    private String floorName;

    private LocalDateTime bookingTime;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationMinutes;

    private String status;

    private Instant paymentCreatedAt;
    private Instant paymentExpiredAt;
    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime refundedAt;

    private Long paymentOrderCode;
    private String paymentLinkId;
    private String checkoutUrl;
    private String qrCode;
    private Integer paymentAmount;
    private String paymentCurrency;
    private String paymentStatus;
    private String paymentDescription;

    public static BookingHistoryResponse fromEntity(Booking booking) {
        if (booking == null) {
            return null;
        }

        var user = booking.getUser();
        var vehicle = booking.getVehicle();
        var vehicleType = vehicle != null ? vehicle.getVehicleType() : null;
        var slot = booking.getSlot();
        var zone = slot != null ? slot.getZone() : null;
        var floor = zone != null ? zone.getFloor() : null;

        Long durationMinutes = null;

        if (booking.getStartTime() != null
                && booking.getEndTime() != null) {
            durationMinutes = ChronoUnit.MINUTES.between(
                    booking.getStartTime(),
                    booking.getEndTime()
            );
        }

        String bookingCode = booking.getId() == null
                ? null
                : String.format("BK-%06d", booking.getId());

        return BookingHistoryResponse.builder()
                .id(booking.getId())
                .bookingCode(bookingCode)
                .userId(user != null ? user.getId() : null)
                .customerName(user != null ? user.getFullName() : null)
                .customerEmail(user != null ? user.getEmail() : null)
                .vehicleId(vehicle != null ? vehicle.getId() : null)
                .licensePlate(vehicle != null ? vehicle.getLicensePlate() : null)
                .vehicleColor(vehicle != null ? vehicle.getColor() : null)
                .vehicleTypeId(vehicleType != null ? vehicleType.getId() : null)
                .vehicleTypeName(vehicleType != null ? vehicleType.getTypeName() : null)
                .slotId(slot != null ? slot.getId() : null)
                .slotCode(slot != null ? slot.getSlotCode() : null)
                .floorId(floor != null ? floor.getId() : null)
                .floorName(floor != null ? floor.getFloorName() : null)
                .bookingTime(booking.getBookingTime())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .durationMinutes(durationMinutes)
                .status(booking.getStatus())
                .paymentCreatedAt(booking.getPaymentCreatedAt())
                .paymentExpiredAt(booking.getPaymentExpiredAt())
                .paidAt(booking.getPaidAt())
                .cancelledAt(booking.getCancelledAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .refundedAt(booking.getRefundedAt())
                .paymentOrderCode(booking.getPaymentOrderCode())
                .paymentLinkId(booking.getPaymentLinkId())
                .checkoutUrl(booking.getCheckoutUrl())
                .qrCode(booking.getQrCode())
                .paymentAmount(booking.getPaymentAmount())
                .paymentCurrency(booking.getPaymentCurrency())
                .paymentStatus(booking.getPaymentStatus())
                .paymentDescription(booking.getPaymentDescription())
                .build();
    }
}
