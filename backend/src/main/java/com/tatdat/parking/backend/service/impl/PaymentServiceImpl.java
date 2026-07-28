package com.tatdat.parking.backend.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tatdat.parking.backend.dto.CreateCheckoutPayOSPaymentRequest;
import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSPaymentStatusResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.service.NotificationService;
import com.tatdat.parking.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final int FALLBACK_PRICE_PER_HOUR = 4000;
    private static final int MINIMUM_PAYMENT_AMOUNT = 1000;
    private static final int PAYMENT_TIMEOUT_MINUTES = 10;

    private static final String SLOT_STATUS_AVAILABLE =
            "AVAILABLE";

    private static final String SLOT_STATUS_RESERVED =
            "RESERVED";

    private static final String NOTIFICATION_BOOKING_CONFIRMED =
            "BOOKING_CONFIRMED";

    private final PayOS payOS;

    private final BookingRepository bookingRepository;

    private final PricingPolicyRepository pricingPolicyRepository;

    private final ParkingSlotRepository parkingSlotRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.business-time-zone:Asia/Ho_Chi_Minh}")
    private String businessTimeZone;

    /**
     * Tạo link thanh toán PayOS cho booking của Driver.
     *
     * Method này chỉ tạo QR/link thanh toán.
     * Chưa tạo notification booking thành công tại đây.
     */
    @Override
    @Transactional
    public CreatePayOSPaymentResponse createPayOSPayment(
            Integer bookingId
    ) throws Exception {

        Booking booking =
                bookingRepository
                        .findById(bookingId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Booking not found"
                                )
                        );

        validateBookingOwnedByCurrentUser(booking);
        validateBookingCanCreatePayment(booking);

        /*
         * Nếu booking đã có dữ liệu thanh toán còn hiệu lực,
         * trả về dữ liệu hiện có thay vì tạo QR mới.
         */
        if (hasExistingPaymentData(booking)) {
            return buildPaymentResponse(booking);
        }

        /*
         * Thời hạn thanh toán bắt đầu khi backend
         * thực sự tạo QR PayOS.
         */
        Instant paymentCreatedAt =
                Instant.now();

        Instant paymentExpiredAt =
                paymentCreatedAt.plus(
                        PAYMENT_TIMEOUT_MINUTES,
                        ChronoUnit.MINUTES
                );

        booking.setPaymentCreatedAt(
                paymentCreatedAt
        );

        booking.setPaymentExpiredAt(
                paymentExpiredAt
        );

        Long orderCode =
                booking.getPaymentOrderCode();

        if (orderCode == null) {
            orderCode =
                    generateOrderCode(
                            booking.getId()
                    );
        }

        int amount =
                calculateBookingAmount(booking);

        String description =
                buildPaymentDescription(booking);

        String returnUrl =
                frontendUrl
                        + "/user-ui?payment=success&bookingId="
                        + booking.getId();

        String cancelUrl =
                frontendUrl
                        + "/user-ui?payment=cancel&bookingId="
                        + booking.getId();

        var paymentRequestBuilder =
                CreatePaymentLinkRequest
                        .builder()
                        .orderCode(orderCode)
                        .amount((long) amount)
                        .description(description)
                        .returnUrl(returnUrl)
                        .cancelUrl(cancelUrl);

        applyPayOSExpiredAt(
                paymentRequestBuilder,
                paymentExpiredAt
        );

        CreatePaymentLinkRequest paymentRequest =
                paymentRequestBuilder.build();

        CreatePaymentLinkResponse paymentResponse =
                payOS.paymentRequests()
                        .create(paymentRequest);

        booking.setPaymentOrderCode(orderCode);
        booking.setPaymentAmount(amount);
        booking.setPaymentCurrency("VND");

        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_PENDING
        );

        booking.setPaymentDescription(
                description
        );

        booking.setPaymentLinkId(
                paymentResponse.getPaymentLinkId()
        );

        booking.setCheckoutUrl(
                paymentResponse.getCheckoutUrl()
        );

        booking.setQrCode(
                paymentResponse.getQrCode()
        );

        Booking savedBooking =
                bookingRepository.save(booking);

        return buildPaymentResponse(
                savedBooking
        );
    }

    /**
     * Tạo QR thanh toán tại bước checkout.
     *
     * Method này chỉ tạo link thanh toán.
     * Notification checkout phải được tạo tại nghiệp vụ
     * hoàn thành checkout xe.
     */
    @Override
    @Transactional
    public CreatePayOSPaymentResponse createCheckoutPayOSPayment(
            CreateCheckoutPayOSPaymentRequest request
    ) throws Exception {

        if (request == null) {
            throw new RuntimeException(
                    "Payment request is required"
            );
        }

        if (
                request.getTicketId() == null
                        || request
                        .getTicketId()
                        .trim()
                        .isEmpty()
        ) {
            throw new RuntimeException(
                    "Ticket ID is required"
            );
        }

        if (
                request.getAmount() == null
                        || request
                        .getAmount()
                        .compareTo(BigDecimal.ZERO) <= 0
        ) {
            throw new RuntimeException(
                    "Payment amount must be greater than 0"
            );
        }

        int amount =
                request.getAmount()
                        .setScale(
                                0,
                                RoundingMode.HALF_UP
                        )
                        .intValue();

        if (amount < MINIMUM_PAYMENT_AMOUNT) {
            amount = MINIMUM_PAYMENT_AMOUNT;
        }

        String ticketId =
                request.getTicketId()
                        .trim()
                        .toUpperCase();

        Long orderCode =
                generateCheckoutOrderCode(
                        ticketId
                );

        String description =
                request.getDescription();

        if (
                description == null
                        || description
                        .trim()
                        .isEmpty()
        ) {
            description =
                    "CHECKOUT"
                            + ticketId.replaceAll(
                            "[^A-Z0-9]",
                            ""
                    );
        }

        description =
                description.trim();

        if (description.length() > 25) {
            description =
                    description.substring(
                            0,
                            25
                    );
        }

        String returnUrl =
                frontendUrl
                        + "/check-in-out?payment=success&ticketId="
                        + ticketId;

        String cancelUrl =
                frontendUrl
                        + "/check-in-out?payment=cancel&ticketId="
                        + ticketId;

        Instant paymentCreatedAt =
                Instant.now();

        Instant paymentExpiredAt =
                paymentCreatedAt.plus(
                        PAYMENT_TIMEOUT_MINUTES,
                        ChronoUnit.MINUTES
                );

        var paymentRequestBuilder =
                CreatePaymentLinkRequest
                        .builder()
                        .orderCode(orderCode)
                        .amount((long) amount)
                        .description(description)
                        .returnUrl(returnUrl)
                        .cancelUrl(cancelUrl);

        applyPayOSExpiredAt(
                paymentRequestBuilder,
                paymentExpiredAt
        );

        CreatePaymentLinkRequest paymentRequest =
                paymentRequestBuilder.build();

        CreatePaymentLinkResponse paymentResponse =
                payOS.paymentRequests()
                        .create(paymentRequest);

        return CreatePayOSPaymentResponse
                .builder()
                .bookingId(null)
                .orderCode(orderCode)
                .amount(amount)
                .currency("VND")
                .bookingStatus(null)
                .paymentStatus(
                        Booking.PAYMENT_STATUS_PENDING
                )
                .paymentLinkId(
                        paymentResponse.getPaymentLinkId()
                )
                .checkoutUrl(
                        paymentResponse.getCheckoutUrl()
                )
                .qrCode(
                        paymentResponse.getQrCode()
                )
                .paymentCreatedAt(
                        paymentCreatedAt
                )
                .paymentExpiredAt(
                        paymentExpiredAt
                )
                .build();
    }

    /**
     * Kiểm tra trạng thái giao dịch PayOS.
     */
    @Override
    public PayOSPaymentStatusResponse getPayOSPaymentStatus(
            Long orderCode
    ) throws Exception {

        if (orderCode == null) {
            throw new RuntimeException(
                    "Order code is required"
            );
        }

        Object paymentInfo =
                payOS.get(
                        "/v2/payment-requests/"
                                + orderCode,
                        Object.class
                );

        Map<String, Object> paymentInfoMap =
                objectMapper.convertValue(
                        paymentInfo,
                        new TypeReference<
                                Map<String, Object>
                                >() {
                        }
                );

        Map<String, Object> dataMap =
                paymentInfoMap;

        Object dataObject =
                paymentInfoMap.get("data");

        if (dataObject instanceof Map<?, ?>) {
            dataMap =
                    objectMapper.convertValue(
                            dataObject,
                            new TypeReference<
                                    Map<String, Object>
                                    >() {
                            }
                    );
        }

        String status =
                String.valueOf(
                        dataMap.getOrDefault(
                                "status",
                                paymentInfoMap.getOrDefault(
                                        "status",
                                        "PENDING"
                                )
                        )
                );

        Object amountValue =
                dataMap.get("amount");

        Integer amount = null;

        if (amountValue instanceof Number number) {
            amount = number.intValue();
        }

        String paymentLinkId =
                dataMap.get("paymentLinkId") == null
                        ? null
                        : String.valueOf(
                        dataMap.get(
                                "paymentLinkId"
                        )
                );

        return PayOSPaymentStatusResponse
                .builder()
                .orderCode(orderCode)
                .paymentStatus(status)
                .amount(amount)
                .paymentLinkId(paymentLinkId)
                .build();
    }

    /**
     * Xử lý webhook từ PayOS.
     *
     * Khi thanh toán booking thành công:
     * - Booking chuyển thành CONFIRMED.
     * - Payment chuyển thành PAID.
     * - Slot chuyển thành RESERVED.
     * - Chỉ chủ booking nhận notification.
     */
    @Override
    @Transactional
    public void handlePayOSWebhook(
            PayOSWebhookRequest request
    ) throws Exception {

        if (request == null) {
            System.out.println(
                    "PayOS webhook ignored. Request is null."
            );

            return;
        }

        Map<String, Object> webhookBody =
                objectMapper.convertValue(
                        request,
                        new TypeReference<
                                Map<String, Object>
                                >() {
                        }
                );

        WebhookData webhookData;

        try {
            webhookData =
                    payOS.webhooks()
                            .verify(webhookBody);
        } catch (Exception exception) {
            System.out.println(
                    "PayOS webhook verify failed or test webhook ignored: "
                            + exception.getMessage()
            );

            return;
        }

        if (
                webhookData == null
                        || webhookData
                        .getOrderCode() == null
        ) {
            System.out.println(
                    "PayOS webhook ignored. Missing orderCode."
            );

            return;
        }

        Booking booking =
                bookingRepository
                        .findByPaymentOrderCodeForUpdate(
                                webhookData
                                        .getOrderCode()
                        )
                        .orElse(null);

        if (booking == null) {
            System.out.println(
                    "PayOS webhook ignored. Booking not found for orderCode: "
                            + webhookData.getOrderCode()
            );

            return;
        }

        String currentBookingStatus =
                normalizeText(
                        booking.getStatus()
                );

        String currentPaymentStatus =
                normalizeText(
                        booking.getPaymentStatus()
                );

        /*
         * Chặn webhook được gửi lại nhiều lần.
         *
         * Khi booking đã CONFIRMED hoặc PAID,
         * không tạo notification lần thứ hai.
         */
        if (
                Booking.STATUS_CONFIRMED.equals(
                        currentBookingStatus
                )
                        || Booking.PAYMENT_STATUS_PAID.equals(
                        currentPaymentStatus
                )
        ) {
            markBookingSlotAsReserved(
                    booking
            );

            System.out.println(
                    "PayOS webhook ignored. Booking already paid. bookingId="
                            + booking.getId()
            );

            return;
        }

        if (
                !Booking.STATUS_PENDING_PAYMENT.equals(
                        currentBookingStatus
                )
        ) {
            System.out.println(
                    "PayOS webhook ignored. Booking is not pending payment. bookingId="
                            + booking.getId()
                            + ", status="
                            + currentBookingStatus
            );

            return;
        }

        String payosCode =
                normalizeText(
                        webhookData.getCode()
                );

        String payosDesc =
                webhookData.getDesc();

        Instant now =
                Instant.now();

        /*
         * Webhook đến sau khi hết hạn không được
         * kích hoạt lại booking.
         */
        if (
                booking.getPaymentExpiredAt() != null
                        && !now.isBefore(
                        booking.getPaymentExpiredAt()
                )
        ) {
            expireBookingAsPaymentTimeout(
                    booking,
                    now
            );

            bookingRepository.save(booking);

            System.out.println(
                    "Late PayOS webhook ignored because booking expired. bookingId="
                            + booking.getId()
                            + ", orderCode="
                            + webhookData.getOrderCode()
            );

            return;
        }

        /*
         * PayOS trả code 00 khi thanh toán thành công.
         */
        if ("00".equals(payosCode)) {

            /*
             * Kiểm tra số tiền PayOS trả về
             * có trùng với số tiền booking hay không.
             */
            if (
                    booking.getPaymentAmount() != null
                            && webhookData.getAmount() != null
                            && booking
                            .getPaymentAmount()
                            .intValue()
                            != webhookData
                            .getAmount()
                            .intValue()
            ) {
                booking.setPaymentStatus(
                        Booking.PAYMENT_STATUS_FAILED
                );

                booking.setPaymentDescription(
                        "PayOS amount does not match booking amount"
                );

                bookingRepository.save(booking);

                System.out.println(
                        "PayOS webhook rejected because amount mismatch. bookingId="
                                + booking.getId()
                );

                return;
            }

            booking.setStatus(
                    Booking.STATUS_CONFIRMED
            );

            booking.setPaymentStatus(
                    Booking.PAYMENT_STATUS_PAID
            );

            booking.setPaidAt(
                    toBusinessLocalDateTime(now)
            );

            if (
                    webhookData.getPaymentLinkId()
                            != null
            ) {
                booking.setPaymentLinkId(
                        webhookData
                                .getPaymentLinkId()
                );
            }

            if (
                    webhookData.getAmount()
                            != null
            ) {
                booking.setPaymentAmount(
                        webhookData
                                .getAmount()
                                .intValue()
                );
            }

            /*
             * Chuyển slot sang RESERVED.
             */
            markBookingSlotAsReserved(
                    booking
            );

            Booking savedBooking =
                    bookingRepository.save(
                            booking
                    );

            /*
             * Chỉ tạo notification cho chủ booking.
             *
             * Driver khác, Staff, Manager và Admin
             * không nhận thông báo này.
             */
            createBookingConfirmedNotification(
                    savedBooking
            );

            System.out.println(
                    "PayOS payment confirmed. bookingId="
                            + savedBooking.getId()
                            + ", orderCode="
                            + webhookData.getOrderCode()
                            + ", slotId="
                            + (
                            savedBooking.getSlot()
                                    == null
                                    ? null
                                    : savedBooking
                                    .getSlot()
                                    .getId()
                    )
                            + " marked as RESERVED"
            );

            return;
        }

        /*
         * Thanh toán PayOS thất bại.
         */
        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_FAILED
        );

        booking.setPaymentDescription(
                payosDesc == null
                        || payosDesc.isBlank()
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

    /**
     * Kiểm tra booking có được phép tạo
     * giao dịch thanh toán hay không.
     */
    private void validateBookingCanCreatePayment(
            Booking booking
    ) {
        String bookingStatus =
                normalizeText(
                        booking.getStatus()
                );

        if (
                !Booking.STATUS_PENDING_PAYMENT.equals(
                        bookingStatus
                )
        ) {
            throw new RuntimeException(
                    "Only PENDING_PAYMENT booking can create payment"
            );
        }

        Instant now =
                Instant.now();

        if (
                booking.getPaymentExpiredAt() != null
                        && !now.isBefore(
                        booking.getPaymentExpiredAt()
                )
        ) {
            expireBookingAsPaymentTimeout(
                    booking,
                    now
            );

            bookingRepository.save(booking);

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Booking payment time expired"
            );
        }

        if (
                booking.getStartTime() == null
                        || booking.getEndTime()
                        == null
        ) {
            throw new RuntimeException(
                    "Booking start time and end time are required"
            );
        }

        if (
                !booking.getEndTime()
                        .isAfter(
                                booking.getStartTime()
                        )
        ) {
            throw new RuntimeException(
                    "Booking end time must be after start time"
            );
        }

        if (
                booking.getSlot() == null
                        || booking
                        .getSlot()
                        .getVehicleType()
                        == null
        ) {
            throw new RuntimeException(
                    "Booking slot or vehicle type is missing"
            );
        }
    }

    /**
     * Xác nhận booking thuộc về tài khoản đang đăng nhập.
     */
    private void validateBookingOwnedByCurrentUser(
            Booking booking
    ) {
        User currentUser =
                getCurrentAuthenticatedUser();

        if (
                booking.getUser() == null
                        || booking
                        .getUser()
                        .getId()
                        == null
                        || !booking
                        .getUser()
                        .getId()
                        .equals(
                                currentUser.getId()
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Booking not found"
            );
        }
    }

    /**
     * Lấy tài khoản hiện đang đăng nhập.
     */
    private User getCurrentAuthenticatedUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication
                        .isAuthenticated()
                        || authentication
                        instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        String email =
                authentication.getName();

        if (
                email == null
                        || email.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated user email is missing"
            );
        }

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authenticated user not found"
                        )
                );
    }

    /**
     * Chuyển booking hết hạn thanh toán
     * sang trạng thái CANCELLED/EXPIRED.
     */
    private void expireBookingAsPaymentTimeout(
            Booking booking,
            Instant now
    ) {
        booking.setStatus(
                Booking.STATUS_CANCELLED
        );

        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_EXPIRED
        );

        booking.setCancelledAt(
                toBusinessLocalDateTime(now)
        );
    }

    /**
     * Gán expiredAt vào PayOS request builder.
     *
     * Sử dụng reflection để hỗ trợ nhiều phiên bản SDK.
     */
    private void applyPayOSExpiredAt(
            Object paymentRequestBuilder,
            Instant paymentExpiredAt
    ) {
        if (
                paymentRequestBuilder == null
                        || paymentExpiredAt == null
        ) {
            return;
        }

        long epochSeconds =
                paymentExpiredAt
                        .getEpochSecond();

        Class<?> builderClass =
                paymentRequestBuilder
                        .getClass();

        Class<?>[] types = {
                long.class,
                Long.class,
                int.class,
                Integer.class
        };

        for (Class<?> type : types) {
            Object value;

            if (
                    type.equals(int.class)
                            || type.equals(
                            Integer.class
                    )
            ) {
                if (
                        epochSeconds
                                > Integer.MAX_VALUE
                                || epochSeconds
                                < Integer.MIN_VALUE
                ) {
                    continue;
                }

                value = (int) epochSeconds;
            } else {
                value = epochSeconds;
            }

            try {
                builderClass
                        .getMethod(
                                "expiredAt",
                                type
                        )
                        .invoke(
                                paymentRequestBuilder,
                                value
                        );

                return;
            } catch (
                    ReflectiveOperationException ignored
            ) {
                /*
                 * Thử tiếp kiểu số khác
                 * mà PayOS SDK hỗ trợ.
                 */
            }
        }

        System.out.println(
                "PayOS SDK builder does not expose expiredAt. "
                        + "Backend scheduler still enforces the 10-minute timeout."
        );
    }

    /**
     * Chuyển slot của booking sang RESERVED
     * sau khi thanh toán thành công.
     */
    private void markBookingSlotAsReserved(
            Booking booking
    ) {
        if (
                booking == null
                        || booking.getSlot()
                        == null
                        || booking
                        .getSlot()
                        .getId()
                        == null
        ) {
            return;
        }

        ParkingSlot slot =
                parkingSlotRepository
                        .findById(
                                booking
                                        .getSlot()
                                        .getId()
                        )
                        .orElse(null);

        if (slot == null) {
            System.out.println(
                    "Cannot mark slot as RESERVED. Slot not found for bookingId="
                            + booking.getId()
            );

            return;
        }

        String currentSlotStatus =
                normalizeText(
                        slot.getStatus()
                );

        if (
                currentSlotStatus.isBlank()
                        || SLOT_STATUS_AVAILABLE.equals(
                        currentSlotStatus
                )
        ) {
            slot.setStatus(
                    SLOT_STATUS_RESERVED
            );

            parkingSlotRepository.save(
                    slot
            );

            booking.setSlot(slot);

            return;
        }

        if (
                SLOT_STATUS_RESERVED.equals(
                        currentSlotStatus
                )
        ) {
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

    /**
     * Kiểm tra booking đã có QR/link thanh toán hay chưa.
     */
    private boolean hasExistingPaymentData(
            Booking booking
    ) {
        return booking.getPaymentOrderCode()
                != null
                && booking.getCheckoutUrl()
                != null
                && !booking
                .getCheckoutUrl()
                .isBlank()
                && booking.getQrCode()
                != null
                && !booking
                .getQrCode()
                .isBlank();
    }

    /**
     * Tính tổng tiền booking.
     */
    private int calculateBookingAmount(
            Booking booking
    ) {
        if (
                booking.getPaymentAmount() != null
                        && booking
                        .getPaymentAmount()
                        > 0
        ) {
            return booking
                    .getPaymentAmount();
        }

        long minutes =
                Duration.between(
                        booking.getStartTime(),
                        booking.getEndTime()
                ).toMinutes();

        long hours =
                (long) Math.ceil(
                        minutes / 60.0
                );

        if (hours <= 0) {
            hours = 1;
        }

        BigDecimal pricePerHour =
                getActivePricePerHour(
                        booking
                );

        BigDecimal totalAmount =
                pricePerHour.multiply(
                        BigDecimal.valueOf(
                                hours
                        )
                );

        int roundedAmount =
                totalAmount
                        .setScale(
                                0,
                                RoundingMode.HALF_UP
                        )
                        .intValueExact();

        if (
                roundedAmount
                        < MINIMUM_PAYMENT_AMOUNT
        ) {
            return MINIMUM_PAYMENT_AMOUNT;
        }

        return roundedAmount;
    }

    /**
     * Lấy giá đỗ xe mặc định theo loại xe.
     */
    private BigDecimal getActivePricePerHour(
            Booking booking
    ) {
        Integer vehicleTypeId =
                booking
                        .getSlot()
                        .getVehicleType()
                        .getId();

        return pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByUpdatedAtDesc(
                        vehicleTypeId,
                        PricingPolicy.STATUS_ACTIVE
                )
                .or(() ->
                        pricingPolicyRepository
                                .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByIdDesc(
                                        vehicleTypeId,
                                        PricingPolicy.STATUS_ACTIVE
                                )
                )
                .map(
                        PricingPolicy::getPricePerHour
                )
                .filter(price ->
                        price != null
                                && price.compareTo(
                                BigDecimal.ZERO
                        ) > 0
                )
                .orElseGet(() -> {
                    System.out.println(
                            "Active pricing policy not found for vehicleTypeId="
                                    + vehicleTypeId
                                    + ". Using fallback price: "
                                    + FALLBACK_PRICE_PER_HOUR
                    );

                    return BigDecimal.valueOf(
                            FALLBACK_PRICE_PER_HOUR
                    );
                });
    }

    /**
     * Tạo nội dung mô tả thanh toán.
     */
    private String buildPaymentDescription(
            Booking booking
    ) {
        return "BOOKING"
                + booking.getId();
    }

    /**
     * Tạo mã giao dịch PayOS cho booking.
     */
    private Long generateOrderCode(
            Integer bookingId
    ) {
        String timePart =
                String.valueOf(
                        System.currentTimeMillis()
                );

        String shortTimePart =
                timePart.substring(
                        Math.max(
                                0,
                                timePart.length() - 6
                        )
                );

        String rawOrderCode =
                String.valueOf(bookingId)
                        + shortTimePart;

        return Long.parseLong(
                rawOrderCode
        );
    }

    /**
     * Tạo mã giao dịch PayOS cho checkout.
     */
    private Long generateCheckoutOrderCode(
            String ticketId
    ) {
        String safeTicketId =
                ticketId == null
                        ? ""
                        : ticketId;

        String digits =
                safeTicketId.replaceAll(
                        "[^0-9]",
                        ""
                );

        if (digits.isBlank()) {
            digits = "9";
        }

        String timePart =
                String.valueOf(
                        System.currentTimeMillis()
                );

        String shortTimePart =
                timePart.substring(
                        Math.max(
                                0,
                                timePart.length() - 6
                        )
                );

        String rawOrderCode =
                digits + shortTimePart;

        if (rawOrderCode.length() > 15) {
            rawOrderCode =
                    rawOrderCode.substring(
                            rawOrderCode.length() - 15
                    );
        }

        return Long.parseLong(
                rawOrderCode
        );
    }

    /**
     * Chuyển Booking thành response thanh toán.
     */
    private CreatePayOSPaymentResponse buildPaymentResponse(
            Booking booking
    ) {
        return CreatePayOSPaymentResponse
                .builder()
                .bookingId(
                        booking.getId()
                )
                .orderCode(
                        booking.getPaymentOrderCode()
                )
                .amount(
                        booking.getPaymentAmount()
                )
                .currency(
                        booking.getPaymentCurrency()
                )
                .bookingStatus(
                        booking.getStatus()
                )
                .paymentStatus(
                        booking.getPaymentStatus()
                )
                .paymentLinkId(
                        booking.getPaymentLinkId()
                )
                .checkoutUrl(
                        booking.getCheckoutUrl()
                )
                .qrCode(
                        booking.getQrCode()
                )
                .paymentCreatedAt(
                        booking.getPaymentCreatedAt()
                )
                .paymentExpiredAt(
                        booking.getPaymentExpiredAt()
                )
                .build();
    }

    /**
     * Tạo notification booking thành công
     * chỉ dành cho chủ booking.
     */
    private void createBookingConfirmedNotification(
            Booking booking
    ) {
        if (
                booking == null
                        || booking.getUser()
                        == null
                        || booking
                        .getUser()
                        .getId()
                        == null
        ) {
            System.out.println(
                    "Booking confirmed notification skipped. "
                            + "Booking owner is missing."
            );

            return;
        }

        Integer recipientUserId =
                booking
                        .getUser()
                        .getId();

        String licensePlate =
                "N/A";

        if (
                booking.getVehicle() != null
                        && booking
                        .getVehicle()
                        .getLicensePlate()
                        != null
                        && !booking
                        .getVehicle()
                        .getLicensePlate()
                        .isBlank()
        ) {
            licensePlate =
                    booking
                            .getVehicle()
                            .getLicensePlate();
        }

        String slotText =
                "N/A";

        if (
                booking.getSlot() != null
                        && booking
                        .getSlot()
                        .getId()
                        != null
        ) {
            slotText =
                    String.valueOf(
                            booking
                                    .getSlot()
                                    .getId()
                    );
        }

        String message =
                "Your booking #"
                        + booking.getId()
                        + " for vehicle "
                        + licensePlate
                        + " at parking slot "
                        + slotText
                        + " has been paid and confirmed successfully.";

        notificationService
                .createPersonalNotification(
                        recipientUserId,
                        "Booking confirmed",
                        message,
                        NOTIFICATION_BOOKING_CONFIRMED
                );
    }

    /**
     * Chuyển Instant sang giờ kinh doanh.
     */
    private LocalDateTime toBusinessLocalDateTime(
            Instant instant
    ) {
        Instant safeInstant =
                instant == null
                        ? Instant.now()
                        : instant;

        return LocalDateTime.ofInstant(
                safeInstant,
                ZoneId.of(
                        businessTimeZone
                )
        );
    }

    /**
     * Chuẩn hóa chuỗi trạng thái.
     */
    private String normalizeText(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toUpperCase();
    }
}