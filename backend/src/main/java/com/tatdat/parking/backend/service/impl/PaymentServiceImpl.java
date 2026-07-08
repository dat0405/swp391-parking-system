package com.tatdat.parking.backend.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final int FALLBACK_PRICE_PER_HOUR = 4000;
    private static final int MINIMUM_PAYMENT_AMOUNT = 1000;

    private static final String SLOT_STATUS_AVAILABLE = "AVAILABLE";
    private static final String SLOT_STATUS_RESERVED = "RESERVED";

    private final PayOS payOS;
    private final BookingRepository bookingRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    @Transactional
    public CreatePayOSPaymentResponse createPayOSPayment(Integer bookingId) throws Exception {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        validateBookingCanCreatePayment(booking);

        if (hasExistingPaymentData(booking)) {
            return buildPaymentResponse(booking);
        }

        Long orderCode = booking.getPaymentOrderCode();

        if (orderCode == null) {
            orderCode = generateOrderCode(booking.getId());
        }

        int amount = calculateBookingAmount(booking);
        String description = buildPaymentDescription(booking);

        String returnUrl = frontendUrl
                + "/user-ui?payment=success&bookingId="
                + booking.getId();

        String cancelUrl = frontendUrl
                + "/user-ui?payment=cancel&bookingId="
                + booking.getId();

        CreatePaymentLinkRequest paymentRequest = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount((long) amount)
                .description(description)
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .build();

        CreatePaymentLinkResponse paymentResponse = payOS.paymentRequests().create(paymentRequest);

        booking.setPaymentOrderCode(orderCode);
        booking.setPaymentAmount(amount);
        booking.setPaymentCurrency("VND");
        booking.setPaymentStatus(Booking.PAYMENT_STATUS_PENDING);
        booking.setPaymentDescription(description);
        booking.setPaymentLinkId(paymentResponse.getPaymentLinkId());
        booking.setCheckoutUrl(paymentResponse.getCheckoutUrl());
        booking.setQrCode(paymentResponse.getQrCode());

        Booking savedBooking = bookingRepository.save(booking);

        return buildPaymentResponse(savedBooking);
    }

    @Override
    @Transactional
    public void handlePayOSWebhook(PayOSWebhookRequest request) throws Exception {
        if (request == null) {
            System.out.println("PayOS webhook ignored. Request is null.");
            return;
        }

        Map<String, Object> webhookBody = objectMapper.convertValue(
                request,
                new TypeReference<Map<String, Object>>() {
                }
        );

        WebhookData webhookData;

        try {
            webhookData = payOS.webhooks().verify(webhookBody);
        } catch (Exception exception) {
            System.out.println("PayOS webhook verify failed or test webhook ignored: " + exception.getMessage());
            return;
        }

        if (webhookData == null || webhookData.getOrderCode() == null) {
            System.out.println("PayOS webhook ignored. Missing orderCode.");
            return;
        }

        Booking booking = bookingRepository.findByPaymentOrderCode(webhookData.getOrderCode())
                .orElse(null);

        if (booking == null) {
            System.out.println("PayOS webhook ignored. Booking not found for orderCode: " + webhookData.getOrderCode());
            return;
        }

        String currentBookingStatus = normalizeText(booking.getStatus());
        String currentPaymentStatus = normalizeText(booking.getPaymentStatus());

        if (Booking.STATUS_CONFIRMED.equals(currentBookingStatus)
                || Booking.PAYMENT_STATUS_PAID.equals(currentPaymentStatus)) {
            markBookingSlotAsReserved(booking);

            System.out.println("PayOS webhook ignored. Booking already paid. bookingId=" + booking.getId());
            return;
        }

        if (!Booking.STATUS_PENDING_PAYMENT.equals(currentBookingStatus)) {
            System.out.println(
                    "PayOS webhook ignored. Booking is not pending payment. bookingId="
                            + booking.getId()
                            + ", status="
                            + currentBookingStatus
            );
            return;
        }

        String payosCode = normalizeText(webhookData.getCode());
        String payosDesc = webhookData.getDesc();

        if ("00".equals(payosCode)) {
            booking.setStatus(Booking.STATUS_CONFIRMED);
            booking.setPaymentStatus(Booking.PAYMENT_STATUS_PAID);
            booking.setPaidAt(LocalDateTime.now());

            if (webhookData.getPaymentLinkId() != null) {
                booking.setPaymentLinkId(webhookData.getPaymentLinkId());
            }

            if (webhookData.getAmount() != null) {
                booking.setPaymentAmount(webhookData.getAmount().intValue());
            }

            markBookingSlotAsReserved(booking);

            bookingRepository.save(booking);

            System.out.println(
                    "PayOS payment confirmed. bookingId="
                            + booking.getId()
                            + ", orderCode="
                            + webhookData.getOrderCode()
                            + ", slotId="
                            + (booking.getSlot() == null ? null : booking.getSlot().getId())
                            + " marked as RESERVED"
            );
            return;
        }

        booking.setPaymentStatus(Booking.PAYMENT_STATUS_FAILED);
        booking.setPaymentDescription(
                payosDesc == null || payosDesc.isBlank()
                        ? "PayOS payment failed"
                        : payosDesc
        );

        bookingRepository.save(booking);

        System.out.println(
                "PayOS payment failed. bookingId="
                        + booking.getId()
                        + ", code="
                        + payosCode
                        + ", desc="
                        + payosDesc
        );
    }

    private void validateBookingCanCreatePayment(Booking booking) {
        String bookingStatus = normalizeText(booking.getStatus());

        if (!Booking.STATUS_PENDING_PAYMENT.equals(bookingStatus)) {
            throw new RuntimeException("Only PENDING_PAYMENT booking can create payment");
        }

        if (booking.getPaymentExpiredAt() != null
                && booking.getPaymentExpiredAt().isBefore(LocalDateTime.now())) {
            booking.setStatus(Booking.STATUS_EXPIRED);
            booking.setPaymentStatus(Booking.PAYMENT_STATUS_EXPIRED);
            bookingRepository.save(booking);

            throw new RuntimeException("Booking payment time expired");
        }

        if (booking.getStartTime() == null || booking.getEndTime() == null) {
            throw new RuntimeException("Booking start time and end time are required");
        }

        if (!booking.getEndTime().isAfter(booking.getStartTime())) {
            throw new RuntimeException("Booking end time must be after start time");
        }

        if (booking.getSlot() == null || booking.getSlot().getVehicleType() == null) {
            throw new RuntimeException("Booking slot or vehicle type is missing");
        }
    }

    private void markBookingSlotAsReserved(Booking booking) {
        if (booking == null || booking.getSlot() == null || booking.getSlot().getId() == null) {
            return;
        }

        ParkingSlot slot = parkingSlotRepository.findById(booking.getSlot().getId())
                .orElse(null);

        if (slot == null) {
            System.out.println("Cannot mark slot as RESERVED. Slot not found for bookingId=" + booking.getId());
            return;
        }

        String currentSlotStatus = normalizeText(slot.getStatus());

        if (currentSlotStatus.isBlank() || SLOT_STATUS_AVAILABLE.equals(currentSlotStatus)) {
            slot.setStatus(SLOT_STATUS_RESERVED);
            parkingSlotRepository.save(slot);
            booking.setSlot(slot);
            return;
        }

        if (SLOT_STATUS_RESERVED.equals(currentSlotStatus)) {
            return;
        }

        System.out.println(
                "Slot status was not changed. bookingId="
                        + booking.getId()
                        + ", slotId="
                        + slot.getId()
                        + ", currentStatus="
                        + slot.getStatus()
        );
    }

    private boolean hasExistingPaymentData(Booking booking) {
        return booking.getPaymentOrderCode() != null
                && booking.getCheckoutUrl() != null
                && !booking.getCheckoutUrl().isBlank()
                && booking.getQrCode() != null
                && !booking.getQrCode().isBlank();
    }

    private int calculateBookingAmount(Booking booking) {
        if (booking.getPaymentAmount() != null && booking.getPaymentAmount() > 0) {
            return booking.getPaymentAmount();
        }

        long minutes = Duration.between(
                booking.getStartTime(),
                booking.getEndTime()
        ).toMinutes();

        long hours = (long) Math.ceil(minutes / 60.0);

        if (hours <= 0) {
            hours = 1;
        }

        BigDecimal pricePerHour = getActivePricePerHour(booking);
        BigDecimal totalAmount = pricePerHour.multiply(BigDecimal.valueOf(hours));

        int roundedAmount = totalAmount
                .setScale(0, RoundingMode.HALF_UP)
                .intValueExact();

        if (roundedAmount < MINIMUM_PAYMENT_AMOUNT) {
            return MINIMUM_PAYMENT_AMOUNT;
        }

        return roundedAmount;
    }

    private BigDecimal getActivePricePerHour(Booking booking) {
        Integer vehicleTypeId = booking.getSlot().getVehicleType().getId();

        return pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByUpdatedAtDesc(
                        vehicleTypeId,
                        PricingPolicy.STATUS_ACTIVE
                )
                .or(() -> pricingPolicyRepository
                        .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByIdDesc(
                                vehicleTypeId,
                                PricingPolicy.STATUS_ACTIVE
                        )
                )
                .map(PricingPolicy::getPricePerHour)
                .filter(price -> price != null && price.compareTo(BigDecimal.ZERO) > 0)
                .orElseGet(() -> {
                    System.out.println(
                            "Active pricing policy not found for vehicleTypeId="
                                    + vehicleTypeId
                                    + ". Using fallback price: "
                                    + FALLBACK_PRICE_PER_HOUR
                    );

                    return BigDecimal.valueOf(FALLBACK_PRICE_PER_HOUR);
                });
    }

    private String buildPaymentDescription(Booking booking) {
        return "BOOKING" + booking.getId();
    }

    private Long generateOrderCode(Integer bookingId) {
        String timePart = String.valueOf(System.currentTimeMillis());
        String shortTimePart = timePart.substring(Math.max(0, timePart.length() - 6));
        String rawOrderCode = String.valueOf(bookingId) + shortTimePart;

        return Long.parseLong(rawOrderCode);
    }

    private CreatePayOSPaymentResponse buildPaymentResponse(Booking booking) {
        return CreatePayOSPaymentResponse.builder()
                .bookingId(booking.getId())
                .orderCode(booking.getPaymentOrderCode())
                .amount(booking.getPaymentAmount())
                .currency(booking.getPaymentCurrency())
                .bookingStatus(booking.getStatus())
                .paymentStatus(booking.getPaymentStatus())
                .paymentLinkId(booking.getPaymentLinkId())
                .checkoutUrl(booking.getCheckoutUrl())
                .qrCode(booking.getQrCode())
                .build();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toUpperCase();
    }
}
