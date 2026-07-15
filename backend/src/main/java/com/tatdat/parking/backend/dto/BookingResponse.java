package com.tatdat.parking.backend.dto;

import com.tatdat.parking.backend.entity.Booking;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponse {

    private Integer id;

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

    private String status;

    private Instant paymentCreatedAt;
    private Instant paymentExpiredAt;
    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;

    private Long paymentOrderCode;
    private Integer paymentAmount;
    private String paymentCurrency;
    private String paymentStatus;
    private String paymentDescription;

    public static BookingResponse fromEntity(Booking booking) {
        if (booking == null) {
            return null;
        }

        return BookingResponse.builder()
                .id(booking.getId())
                .userId(booking.getUser() != null ? booking.getUser().getId() : null)
                .customerName(booking.getUser() != null ? booking.getUser().getFullName() : null)
                .customerEmail(booking.getUser() != null ? booking.getUser().getEmail() : null)
                .vehicleId(booking.getVehicle() != null ? booking.getVehicle().getId() : null)
                .licensePlate(booking.getVehicle() != null ? booking.getVehicle().getLicensePlate() : null)
                .vehicleColor(booking.getVehicle() != null ? booking.getVehicle().getColor() : null)
                .vehicleTypeId(
                        booking.getVehicle() != null
                                && booking.getVehicle().getVehicleType() != null
                                ? booking.getVehicle().getVehicleType().getId()
                                : null
                )
                .vehicleTypeName(
                        booking.getVehicle() != null
                                && booking.getVehicle().getVehicleType() != null
                                ? booking.getVehicle().getVehicleType().getTypeName()
                                : null
                )
                .slotId(booking.getSlot() != null ? booking.getSlot().getId() : null)
                .slotCode(booking.getSlot() != null ? booking.getSlot().getSlotCode() : null)
                .floorId(
                        booking.getSlot() != null
                                && booking.getSlot().getZone() != null
                                && booking.getSlot().getZone().getFloor() != null
                                ? booking.getSlot().getZone().getFloor().getId()
                                : null
                )
                .floorName(
                        booking.getSlot() != null
                                && booking.getSlot().getZone() != null
                                && booking.getSlot().getZone().getFloor() != null
                                ? booking.getSlot().getZone().getFloor().getFloorName()
                                : null
                )
                .bookingTime(booking.getBookingTime())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .paymentCreatedAt(booking.getPaymentCreatedAt())
                .paymentExpiredAt(booking.getPaymentExpiredAt())
                .paidAt(booking.getPaidAt())
                .cancelledAt(booking.getCancelledAt())
                .paymentOrderCode(booking.getPaymentOrderCode())
                .paymentAmount(booking.getPaymentAmount())
                .paymentCurrency(booking.getPaymentCurrency())
                .paymentStatus(booking.getPaymentStatus())
                .paymentDescription(booking.getPaymentDescription())
                .build();
    }
}
