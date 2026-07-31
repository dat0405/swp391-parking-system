package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.ActiveParkingSessionResponse;
import com.tatdat.parking.backend.dto.CheckInRequest;
import com.tatdat.parking.backend.dto.CheckInResponse;
import com.tatdat.parking.backend.dto.CheckOutRequest;
import com.tatdat.parking.backend.dto.CheckOutResponse;
import com.tatdat.parking.backend.dto.ParkingFloorStatsResponse;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.Holiday;
import com.tatdat.parking.backend.entity.ParkingSession;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.Payment;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.HolidayRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/parking-operations")
@RequiredArgsConstructor
public class ParkingOperationController {

    private static final String SESSION_ACTIVE =
            "ACTIVE";

    private static final String SESSION_COMPLETED =
            "COMPLETED";

    private static final String SLOT_AVAILABLE =
            "AVAILABLE";

    private static final String SLOT_RESERVED =
            "RESERVED";

    private static final String SLOT_OCCUPIED =
            "OCCUPIED";

    private static final String SLOT_MAINTENANCE =
            "MAINTENANCE";

    private static final String PAYMENT_PAID =
            "PAID";

    private static final String PAYMENT_PENDING =
            "PENDING";

    private static final String PAYMENT_PAID_BY_BOOKING =
            "PAID_BY_BOOKING";

    private static final String PAYMENT_METHOD_CASH =
            "CASH";

    private static final String PAYMENT_METHOD_QR_CODE =
            "QR_CODE";

    private static final String PAYMENT_METHOD_PREPAID =
            "PREPAID_BOOKING";

    private static final String NOTIFICATION_VEHICLE_CHECKED_IN =
            "VEHICLE_CHECKED_IN";

    private static final String NOTIFICATION_VEHICLE_CHECKED_OUT =
            "VEHICLE_CHECKED_OUT";

    private static final BigDecimal LOST_TICKET_FEE =
            new BigDecimal("10000.00");

    private static final int MAX_TICKET_GENERATION_ATTEMPTS =
            30;

    private static final Set<String> SUPPORTED_PAYMENT_METHODS =
            Set.of(
                    PAYMENT_METHOD_CASH,
                    PAYMENT_METHOD_QR_CODE,
                    PAYMENT_METHOD_PREPAID
            );

    private final VehicleRepository vehicleRepository;

    private final VehicleTypeRepository vehicleTypeRepository;

    private final ParkingSlotRepository parkingSlotRepository;

    private final ParkingSessionRepository parkingSessionRepository;

    private final PricingPolicyRepository pricingPolicyRepository;

    private final PaymentRepository paymentRepository;

    private final HolidayRepository holidayRepository;

    private final BookingRepository bookingRepository;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    /**
     * Check-in xe tại cổng vào.
     *
     * Quy trình:
     * 1. Kiểm tra biển số và loại xe.
     * 2. Kiểm tra xe đã ở trong bãi hay chưa.
     * 3. Tìm booking hợp lệ.
     * 4. Nếu có booking thì dùng slot đã đặt.
     * 5. Nếu không có booking thì tự tìm slot trống.
     * 6. Tạo ParkingSession và chuyển slot thành OCCUPIED.
     * 7. Tạo notification riêng cho tài khoản đang thao tác.
     */
    @PostMapping("/check-in")
    @Transactional
    public CheckInResponse checkIn(
            @RequestBody CheckInRequest request
    ) {
        validateCheckInRequest(request);

        /*
         * Lấy đúng tài khoản Staff/Admin đang thao tác.
         *
         * Không nhận userId từ frontend.
         */
        User currentOperator =
                getCurrentAuthenticatedUser();

        String licensePlate =
                normalizeLicensePlate(
                        request.getLicensePlate()
                );

        Integer vehicleTypeId =
                request.getVehicleTypeId();

        LocalDateTime checkInTime =
                currentUtcDateTime();

        VehicleType vehicleType =
                vehicleTypeRepository
                        .findById(vehicleTypeId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Vehicle type not found"
                                )
                        );

        Vehicle vehicle =
                findOrCreateVehicle(
                        licensePlate,
                        vehicleType
                );

        validateVehicleType(
                vehicle,
                vehicleType
        );

        parkingSessionRepository
                .findFirstByVehicle_LicensePlateAndStatus(
                        licensePlate,
                        SESSION_ACTIVE
                )
                .ifPresent(existingSession -> {
                    throw new RuntimeException(
                            "Vehicle is already checked in"
                    );
                });

        Booking validBooking =
                findValidBookingForCheckIn(
                        licensePlate,
                        checkInTime
                );

        ParkingSlot slot;

        if (validBooking != null) {
            slot =
                    validateAndGetBookingSlot(
                            validBooking,
                            vehicleTypeId
                    );
        } else {
            slot =
                    findFirstAvailableSlotForWalkIn(
                            vehicleTypeId
                    );
        }

        String ticketId =
                generateUniqueTicketId();

        ParkingSession session =
                ParkingSession.builder()
                        .ticketId(ticketId)
                        .vehicle(vehicle)
                        .slot(slot)
                        .booking(validBooking)
                        .checkInTime(checkInTime)
                        .status(SESSION_ACTIVE)
                        .build();

        ParkingSession savedSession =
                parkingSessionRepository.save(
                        session
                );

        slot.setStatus(SLOT_OCCUPIED);

        parkingSlotRepository.save(
                slot
        );

        if (validBooking != null) {
            validBooking.setStatus(
                    Booking.STATUS_CHECKED_IN
            );

            validBooking.setCheckedInAt(
                    checkInTime
            );

            bookingRepository.save(
                    validBooking
            );
        }

        CheckInResponse response =
                CheckInResponse.builder()
                        .sessionId(
                                savedSession.getId()
                        )
                        .ticketId(
                                savedSession.getTicketId()
                        )
                        .licensePlate(
                                vehicle.getLicensePlate()
                        )
                        .slotCode(
                                slot.getSlotCode()
                        )
                        .checkInTime(
                                savedSession.getCheckInTime()
                        )
                        .status(
                                savedSession.getStatus()
                        )
                        .build();

        /*
         * Chỉ tài khoản vừa thực hiện check-in
         * nhận được thông báo này.
         */
        createCheckInNotification(
                currentOperator,
                savedSession
        );

        return response;
    }

    /**
     * Tìm thông tin và tính trước phí checkout.
     *
     * Phương thức này chưa thay đổi trạng thái session,
     * booking hoặc parking slot.
     *
     * Không tạo notification trong API preview.
     */
    @GetMapping("/check-out/search")
    @Transactional(readOnly = true)
    public CheckOutResponse searchCheckOut(
            @RequestParam(required = false)
            String ticketId,

            @RequestParam(required = false)
            String licensePlate,

            @RequestParam(
                    required = false,
                    defaultValue = "false"
            )
            Boolean lostTicket
    ) {
        CheckOutRequest request =
                new CheckOutRequest();

        request.setTicketId(ticketId);

        request.setLicensePlate(
                licensePlate
        );

        request.setLostTicket(
                Boolean.TRUE.equals(
                        lostTicket
                )
        );

        ParkingSession session =
                findActiveSessionForCheckout(
                        request
                );

        LocalDateTime previewTime =
                currentUtcDateTime();

        return buildCheckOutPreview(
                session,
                Boolean.TRUE.equals(
                        request.getLostTicket()
                ),
                previewTime
        );
    }

    /**
     * Hoàn tất checkout.
     *
     * Frontend chỉ gọi API này sau khi:
     * - PayOS xác nhận thanh toán;
     * - nhân viên xác nhận đã nhận tiền mặt;
     * - hoặc booking đã trả trước và không phát sinh phí.
     *
     * Sau khi checkout hoàn tất, chỉ tài khoản
     * Staff/Admin đang thao tác nhận notification.
     */
    @PostMapping("/check-out")
    @Transactional
    public CheckOutResponse checkOut(
            @RequestBody CheckOutRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Checkout request is required"
            );
        }

        /*
         * Lấy đúng tài khoản đang thao tác.
         */
        User currentOperator =
                getCurrentAuthenticatedUser();

        ParkingSession session =
                findActiveSessionForCheckout(
                        request
                );

        LocalDateTime checkOutTime =
                currentUtcDateTime();

        CheckOutResponse preview =
                buildCheckOutPreview(
                        session,
                        Boolean.TRUE.equals(
                                request.getLostTicket()
                        ),
                        checkOutTime
                );

        boolean prepaidBooking =
                Boolean.TRUE.equals(
                        preview.getPrepaidBooking()
                );

        BigDecimal amountDue =
                safeMoney(
                        preview.getAmountDue()
                );

        String paymentMethod =
                resolvePaymentMethod(
                        request.getPaymentMethod(),
                        amountDue,
                        prepaidBooking
                );

        /*
         * Hoàn tất parking session.
         */
        session.setCheckOutTime(
                checkOutTime
        );

        session.setStatus(
                SESSION_COMPLETED
        );

        parkingSessionRepository.save(
                session
        );

        /*
         * Hoàn tất booking nếu session thuộc booking.
         */
        Booking booking =
                session.getBooking();

        if (booking != null) {
            booking.setStatus(
                    Booking.STATUS_COMPLETED
            );

            booking.setCheckedOutAt(
                    checkOutTime
            );

            bookingRepository.save(
                    booking
            );
        }

        /*
         * Trả slot về AVAILABLE.
         */
        ParkingSlot slot =
                session.getSlot();

        if (slot == null) {
            throw new RuntimeException(
                    "Parking session does not contain a parking slot"
            );
        }

        slot.setStatus(
                SLOT_AVAILABLE
        );

        parkingSlotRepository.save(
                slot
        );

        /*
         * Chỉ tạo Payment khi thực sự có số tiền cần trả.
         *
         * Booking trả trước và không quá giờ:
         * amountDue = 0, không tạo payment mới.
         *
         * Booking trả trước nhưng quá giờ hoặc qua đêm:
         * chỉ tạo payment cho phần phí phát sinh.
         */
        if (
                amountDue.compareTo(
                        BigDecimal.ZERO
                ) > 0
        ) {
            Payment payment =
                    Payment.builder()
                            .parkingSession(session)
                            .amount(amountDue)
                            .paymentMethod(
                                    paymentMethod
                            )
                            .paymentStatus(
                                    PAYMENT_PAID
                            )
                            .paymentTime(
                                    checkOutTime
                            )
                            .build();

            paymentRepository.save(
                    payment
            );
        }

        String paymentStatus;

        if (
                prepaidBooking
                        && amountDue.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            paymentStatus =
                    PAYMENT_PAID_BY_BOOKING;
        } else {
            paymentStatus =
                    PAYMENT_PAID;
        }

        CheckOutResponse response =
                CheckOutResponse.builder()
                        .sessionId(
                                session.getId()
                        )
                        .ticketId(
                                session.getTicketId()
                        )
                        .licensePlate(
                                session
                                        .getVehicle()
                                        .getLicensePlate()
                        )
                        .slotCode(
                                slot.getSlotCode()
                        )
                        .checkInTime(
                                session.getCheckInTime()
                        )
                        .checkOutTime(
                                checkOutTime
                        )
                        .durationHours(
                                preview.getDurationHours()
                        )
                        .pricePerHour(
                                preview.getPricePerHour()
                        )
                        .parkingFee(
                                preview.getParkingFee()
                        )
                        .overtimeFee(
                                preview.getOvertimeFee()
                        )
                        .overstayFee(
                                preview.getOverstayFee()
                        )
                        .holidayName(
                                preview.getHolidayName()
                        )
                        .holidaySurcharge(
                                preview.getHolidaySurcharge()
                        )
                        .lostTicket(
                                Boolean.TRUE.equals(
                                        preview.getLostTicket()
                                )
                        )
                        .lostTicketFee(
                                preview.getLostTicketFee()
                        )
                        .totalAmount(
                                preview.getTotalAmount()
                        )
                        .prepaidBooking(
                                prepaidBooking
                        )
                        .amountDue(
                                amountDue
                        )
                        .paymentStatus(
                                paymentStatus
                        )
                        .build();

        /*
         * Chỉ tài khoản vừa thực hiện checkout
         * nhận thông báo này.
         */
        createCheckOutNotification(
                currentOperator,
                session,
                response,
                paymentMethod
        );

        return response;
    }

    /**
     * Danh sách xe hiện đang ở trong bãi.
     */
    @GetMapping("/active")
    @Transactional(readOnly = true)
    public List<ActiveParkingSessionResponse>
    getActiveParkingSessions() {
        return parkingSessionRepository
                .findByStatusOrderByCheckInTimeDesc(
                        SESSION_ACTIVE
                )
                .stream()
                .map(
                        this::mapToActiveSessionResponse
                )
                .toList();
    }

    /**
     * Thống kê slot theo từng tầng.
     */
    @GetMapping("/floor-stats")
    @Transactional(readOnly = true)
    public List<ParkingFloorStatsResponse>
    getParkingFloorStats() {
        List<ParkingFloorStatsResponse> result =
                parkingSlotRepository
                        .getParkingFloorStats();

        return result == null
                ? List.of()
                : result;
    }

    /**
     * Tính trước phí checkout.
     *
     * checkOutTime được truyền từ bên ngoài để bảo đảm
     * thời gian tính phí và thời gian lưu checkout giống nhau.
     */
    private CheckOutResponse buildCheckOutPreview(
            ParkingSession session,
            boolean lostTicket,
            LocalDateTime checkOutTime
    ) {
        validateSessionForPricing(
                session,
                checkOutTime
        );

        LocalDateTime checkInTime =
                session.getCheckInTime();

        long durationMinutes =
                Duration.between(
                        checkInTime,
                        checkOutTime
                ).toMinutes();

        if (durationMinutes < 0) {
            throw new RuntimeException(
                    "Checkout time cannot be before check-in time"
            );
        }

        long durationHours =
                (long) Math.ceil(
                        durationMinutes / 60.0
                );

        if (durationHours <= 0) {
            durationHours = 1;
        }

        Integer vehicleTypeId =
                session
                        .getVehicle()
                        .getVehicleType()
                        .getId();

        PricingPolicy pricingPolicy =
                pricingPolicyRepository
                        .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByUpdatedAtDesc(
                                vehicleTypeId,
                                PricingPolicy.STATUS_ACTIVE
                        )
                        .or(
                                () -> pricingPolicyRepository
                                        .findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByIdDesc(
                                                vehicleTypeId,
                                                PricingPolicy.STATUS_ACTIVE
                                        )
                        )
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Active pricing policy not found"
                                )
                        );

        BigDecimal pricePerHour =
                safeMoney(
                        pricingPolicy.getPricePerHour()
                );

        BigDecimal policyOvernightFee =
                safeMoney(
                        pricingPolicy.getOvertimeFee()
                );

        BigDecimal policyOverstayFee =
                safeMoney(
                        pricingPolicy.getOverstayFee()
                );

        BigDecimal calculatedParkingFee =
                pricePerHour
                        .multiply(
                                BigDecimal.valueOf(
                                        durationHours
                                )
                        )
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        /*
         * Trong PricingPolicy hiện tại:
         * overtimeFee được sử dụng làm phí qua đêm.
         */
        BigDecimal overnightFee =
                calculateOvertimeFee(
                        checkInTime,
                        checkOutTime,
                        policyOvernightFee
                );

        BigDecimal overstayFee =
                calculateBookingOverstayFee(
                        session.getBooking(),
                        checkOutTime,
                        policyOverstayFee
                );

        boolean prepaidBooking =
                isPrepaidBooking(
                        session.getBooking()
                );

        /*
         * Booking đã thanh toán trước:
         *
         * - Không thu lại phí đỗ xe theo giờ đã booking.
         * - Chỉ thu thêm phí quá giờ.
         * - Chỉ thu thêm phí qua đêm.
         * - Phí mất vé vẫn được áp dụng nếu khách mất vé.
         *
         * Booking chưa trả trước / khách walk-in:
         * thu phí đỗ xe thông thường cùng các phụ phí.
         */
        BigDecimal parkingFee =
                prepaidBooking
                        ? zeroMoney()
                        : calculatedParkingFee;

        Holiday holiday =
                prepaidBooking
                        ? null
                        : findActiveHoliday(
                        checkOutTime.toLocalDate()
                );

        BigDecimal subtotalBeforeHoliday;

        if (prepaidBooking) {
            subtotalBeforeHoliday =
                    overnightFee
                            .add(overstayFee)
                            .setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            );
        } else {
            subtotalBeforeHoliday =
                    parkingFee
                            .add(overnightFee)
                            .add(overstayFee)
                            .setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            );
        }

        BigDecimal holidaySurcharge =
                calculateHolidaySurcharge(
                        subtotalBeforeHoliday,
                        holiday
                );

        /*
         * Phí mất vé là phí phạt cố định,
         * không chịu phụ phí ngày lễ.
         */
        BigDecimal lostTicketFee =
                lostTicket
                        ? safeMoney(
                        LOST_TICKET_FEE
                )
                        : zeroMoney();

        BigDecimal totalAmount =
                subtotalBeforeHoliday
                        .add(holidaySurcharge)
                        .add(lostTicketFee)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );

        return CheckOutResponse.builder()
                .sessionId(
                        session.getId()
                )
                .ticketId(
                        session.getTicketId()
                )
                .licensePlate(
                        session
                                .getVehicle()
                                .getLicensePlate()
                )
                .slotCode(
                        session
                                .getSlot()
                                .getSlotCode()
                )
                .checkInTime(
                        checkInTime
                )
                .checkOutTime(
                        checkOutTime
                )
                .durationHours(
                        durationHours
                )
                .pricePerHour(
                        pricePerHour
                )
                .parkingFee(
                        parkingFee
                )
                .overtimeFee(
                        overnightFee
                )
                .overstayFee(
                        overstayFee
                )
                .holidayName(
                        holiday == null
                                ? null
                                : holiday.getHolidayName()
                )
                .holidaySurcharge(
                        holidaySurcharge
                )
                .lostTicket(
                        lostTicket
                )
                .lostTicketFee(
                        lostTicketFee
                )
                .totalAmount(
                        totalAmount
                )
                .prepaidBooking(
                        prepaidBooking
                )
                .amountDue(
                        totalAmount
                )
                .paymentStatus(
                        prepaidBooking
                                && totalAmount.compareTo(
                                BigDecimal.ZERO
                        ) <= 0
                                ? PAYMENT_PAID_BY_BOOKING
                                : PAYMENT_PENDING
                )
                .build();
    }

    /**
     * Tìm booking hợp lệ của biển số tại thời điểm check-in.
     */
    private Booking findValidBookingForCheckIn(
            String licensePlate,
            LocalDateTime checkInTime
    ) {
        if (
                licensePlate == null
                        || licensePlate.isBlank()
                        || checkInTime == null
        ) {
            return null;
        }

        List<Booking> validBookings =
                bookingRepository
                        .findValidConfirmedBookingsForCheckIn(
                                licensePlate,
                                checkInTime
                        );

        if (
                validBookings == null
                        || validBookings.isEmpty()
        ) {
            return null;
        }

        return validBookings.get(0);
    }

    /**
     * Kiểm tra và lấy slot từ booking.
     */
    private ParkingSlot validateAndGetBookingSlot(
            Booking booking,
            Integer vehicleTypeId
    ) {
        ParkingSlot slot =
                booking.getSlot();

        if (slot == null) {
            throw new RuntimeException(
                    "Booking does not have a parking slot"
            );
        }

        if (
                slot.getVehicleType() == null
                        || slot
                        .getVehicleType()
                        .getId() == null
        ) {
            throw new RuntimeException(
                    "Booking slot does not have a vehicle type"
            );
        }

        if (
                !slot
                        .getVehicleType()
                        .getId()
                        .equals(
                                vehicleTypeId
                        )
        ) {
            throw new RuntimeException(
                    "Booking slot does not match this vehicle type"
            );
        }

        String slotStatus =
                normalizeStatus(
                        slot.getStatus()
                );

        if (
                SLOT_OCCUPIED.equals(
                        slotStatus
                )
        ) {
            throw new RuntimeException(
                    "Booking slot is currently occupied"
            );
        }

        if (
                SLOT_MAINTENANCE.equals(
                        slotStatus
                )
        ) {
            throw new RuntimeException(
                    "Booking slot is currently under maintenance"
            );
        }

        if (
                !SLOT_RESERVED.equals(
                        slotStatus
                )
                        && !SLOT_AVAILABLE.equals(
                        slotStatus
                )
        ) {
            throw new RuntimeException(
                    "Booking slot is not available for check-in"
            );
        }

        return slot;
    }

    /**
     * Tìm slot AVAILABLE đầu tiên cho khách walk-in.
     */
    private ParkingSlot findFirstAvailableSlotForWalkIn(
            Integer vehicleTypeId
    ) {
        List<ParkingSlot> availableSlots =
                parkingSlotRepository
                        .findAvailableSlotsForAutoCheckIn(
                                vehicleTypeId
                        );

        if (
                availableSlots == null
                        || availableSlots.isEmpty()
        ) {
            throw new RuntimeException(
                    "No available slot for this vehicle type"
            );
        }

        ParkingSlot slot =
                availableSlots.get(0);

        if (slot == null) {
            throw new RuntimeException(
                    "Available parking slot not found"
            );
        }

        if (
                !SLOT_AVAILABLE.equals(
                        normalizeStatus(
                                slot.getStatus()
                        )
                )
        ) {
            throw new RuntimeException(
                    "Selected parking slot is no longer available"
            );
        }

        if (
                slot.getVehicleType() == null
                        || slot
                        .getVehicleType()
                        .getId() == null
                        || !slot
                        .getVehicleType()
                        .getId()
                        .equals(
                                vehicleTypeId
                        )
        ) {
            throw new RuntimeException(
                    "Parking slot does not match this vehicle type"
            );
        }

        return slot;
    }

    /**
     * Tìm hoặc tạo Vehicle từ biển số.
     */
    private Vehicle findOrCreateVehicle(
            String licensePlate,
            VehicleType vehicleType
    ) {
        return vehicleRepository
                .findByLicensePlate(
                        licensePlate
                )
                .orElseGet(() -> {
                    Vehicle newVehicle =
                            new Vehicle();

                    newVehicle.setLicensePlate(
                            licensePlate
                    );

                    newVehicle.setVehicleType(
                            vehicleType
                    );

                    return vehicleRepository.save(
                            newVehicle
                    );
                });
    }

    /**
     * Kiểm tra loại xe đã lưu có khớp loại xe được scan hay không.
     */
    private void validateVehicleType(
            Vehicle vehicle,
            VehicleType requestedVehicleType
    ) {
        if (
                vehicle == null
                        || requestedVehicleType == null
                        || requestedVehicleType.getId() == null
        ) {
            throw new RuntimeException(
                    "Invalid vehicle information"
            );
        }

        if (
                vehicle.getVehicleType() == null
                        || vehicle
                        .getVehicleType()
                        .getId() == null
        ) {
            throw new RuntimeException(
                    "Vehicle does not have a vehicle type"
            );
        }

        if (
                !vehicle
                        .getVehicleType()
                        .getId()
                        .equals(
                                requestedVehicleType.getId()
                        )
        ) {
            throw new RuntimeException(
                    "Vehicle type does not match this license plate"
            );
        }
    }

    /**
     * Xác định booking đã được thanh toán trước hay chưa.
     */
    private boolean isPrepaidBooking(
            Booking booking
    ) {
        if (booking == null) {
            return false;
        }

        String paymentStatus =
                normalizeStatus(
                        booking.getPaymentStatus()
                );

        /*
         * Chỉ xem là booking trả trước khi dữ liệu thanh toán
         * thực sự đã được ghi nhận PAID.
         *
         * Không dùng riêng booking status như CONFIRMED,
         * CHECKED_IN hoặc COMPLETED để kết luận đã thanh toán,
         * vì trạng thái nghiệp vụ không thay thế trạng thái tiền.
         */
        return PAYMENT_PAID.equals(
                paymentStatus
        )
                || PAYMENT_PAID_BY_BOOKING.equals(
                paymentStatus
        );
    }

    /**
     * Tính phí vượt quá thời gian booking.
     */
    private BigDecimal calculateBookingOverstayFee(
            Booking booking,
            LocalDateTime checkOutTime,
            BigDecimal policyOverstayFee
    ) {
        if (
                booking == null
                        || booking.getEndTime() == null
                        || checkOutTime == null
        ) {
            return zeroMoney();
        }

        BigDecimal overstayPrice =
                safeMoney(
                        policyOverstayFee
                );

        if (
                overstayPrice.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            return zeroMoney();
        }

        if (
                !checkOutTime.isAfter(
                        booking.getEndTime()
                )
        ) {
            return zeroMoney();
        }

        long overstayMinutes =
                Duration.between(
                        booking.getEndTime(),
                        checkOutTime
                ).toMinutes();

        long overstayHours =
                (long) Math.ceil(
                        overstayMinutes / 60.0
                );

        if (overstayHours <= 0) {
            return zeroMoney();
        }

        return overstayPrice
                .multiply(
                        BigDecimal.valueOf(
                                overstayHours
                        )
                )
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );
    }

    /**
     * Tính phí qua đêm theo số lần chuyển sang ngày lịch mới.
     */
    private BigDecimal calculateOvertimeFee(
            LocalDateTime checkInTime,
            LocalDateTime checkOutTime,
            BigDecimal policyOvertimeFee
    ) {
        if (
                checkInTime == null
                        || checkOutTime == null
        ) {
            return zeroMoney();
        }

        BigDecimal overtimePrice =
                safeMoney(
                        policyOvertimeFee
                );

        if (
                overtimePrice.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            return zeroMoney();
        }

        LocalDate checkInDate =
                checkInTime.toLocalDate();

        LocalDate checkOutDate =
                checkOutTime.toLocalDate();

        long overnightDays =
                ChronoUnit.DAYS.between(
                        checkInDate,
                        checkOutDate
                );

        if (overnightDays <= 0) {
            return zeroMoney();
        }

        return overtimePrice
                .multiply(
                        BigDecimal.valueOf(
                                overnightDays
                        )
                )
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );
    }

    /**
     * Tìm ngày lễ đang hoạt động.
     */
    private Holiday findActiveHoliday(
            LocalDate date
    ) {
        if (date == null) {
            return null;
        }

        return holidayRepository
                .findByHolidayDateAndIsActiveTrue(
                        date
                )
                .orElse(null);
    }

    /**
     * Tính phụ phí ngày lễ.
     */
    private BigDecimal calculateHolidaySurcharge(
            BigDecimal subtotalBeforeHoliday,
            Holiday holiday
    ) {
        BigDecimal subtotal =
                safeMoney(
                        subtotalBeforeHoliday
                );

        if (
                subtotal.compareTo(
                        BigDecimal.ZERO
                ) <= 0
                        || holiday == null
        ) {
            return zeroMoney();
        }

        BigDecimal surchargeValue =
                safeMoney(
                        holiday.getSurchargeValue()
                );

        if (
                surchargeValue.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            return zeroMoney();
        }

        String surchargeType =
                normalizeStatus(
                        holiday.getSurchargeType()
                );

        if (surchargeType.isBlank()) {
            surchargeType =
                    "PERCENT";
        }

        if (
                "FIXED".equals(
                        surchargeType
                )
        ) {
            return surchargeValue;
        }

        if (
                !"PERCENT".equals(
                        surchargeType
                )
        ) {
            throw new RuntimeException(
                    "Invalid holiday surcharge type"
            );
        }

        return subtotal
                .multiply(
                        surchargeValue
                )
                .divide(
                        BigDecimal.valueOf(
                                100
                        ),
                        2,
                        RoundingMode.HALF_UP
                );
    }

    /**
     * Tìm session ACTIVE để checkout.
     *
     * Checkout thường:
     * - Bắt buộc có biển số scan ở cổng ra.
     * - Bắt buộc có QR Ticket.
     * - Biển số trong ticket phải khớp biển số scan.
     *
     * Mất vé:
     * - Vẫn bắt buộc scan biển số.
     * - Có thể tìm session bằng biển số.
     */
    private ParkingSession findActiveSessionForCheckout(
            CheckOutRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Checkout request is required"
            );
        }

        String ticketId =
                normalizeTicketId(
                        request.getTicketId()
                );

        String scannedLicensePlate =
                normalizeLicensePlate(
                        request.getLicensePlate()
                );

        boolean lostTicket =
                Boolean.TRUE.equals(
                        request.getLostTicket()
                );

        if (
                scannedLicensePlate == null
                        || scannedLicensePlate.isBlank()
        ) {
            throw new RuntimeException(
                    "Scanned license plate is required for checkout"
            );
        }

        if (
                !lostTicket
                        && (
                        ticketId == null
                                || ticketId.isBlank()
                )
        ) {
            throw new RuntimeException(
                    "QR Ticket is required for normal checkout"
            );
        }

        ParkingSession session;

        if (
                ticketId != null
                        && !ticketId.isBlank()
        ) {
            session =
                    parkingSessionRepository
                            .findFirstByTicketIdAndStatus(
                                    ticketId,
                                    SESSION_ACTIVE
                            )
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "Active parking session not found"
                                    )
                            );
        } else {
            session =
                    parkingSessionRepository
                            .findFirstByVehicle_LicensePlateAndStatus(
                                    scannedLicensePlate,
                                    SESSION_ACTIVE
                            )
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "Active parking session not found"
                                    )
                            );
        }

        assertScannedPlateMatchesSession(
                session,
                scannedLicensePlate,
                lostTicket
        );

        return session;
    }

    /**
     * Đối chiếu biển số scan với biển số trong session.
     */
    private void assertScannedPlateMatchesSession(
            ParkingSession session,
            String scannedLicensePlate,
            boolean lostTicket
    ) {
        if (
                session == null
                        || session.getVehicle() == null
        ) {
            throw new RuntimeException(
                    "Active parking session not found"
            );
        }

        String sessionLicensePlate =
                normalizeLicensePlate(
                        session
                                .getVehicle()
                                .getLicensePlate()
                );

        if (
                sessionLicensePlate == null
                        || sessionLicensePlate.isBlank()
        ) {
            throw new RuntimeException(
                    "Parking session does not have a license plate"
            );
        }

        String normalizedSessionPlate =
                normalizePlateForCompare(
                        sessionLicensePlate
                );

        String normalizedScannedPlate =
                normalizePlateForCompare(
                        scannedLicensePlate
                );

        if (
                !normalizedSessionPlate.equals(
                        normalizedScannedPlate
                )
        ) {
            if (lostTicket) {
                throw new RuntimeException(
                        "Selected vehicle does not match scanned license plate"
                );
            }

            throw new RuntimeException(
                    "QR Ticket does not match scanned license plate"
            );
        }
    }

    /**
     * Chuyển ParkingSession thành response cho danh sách xe đang đỗ.
     */
    private ActiveParkingSessionResponse
    mapToActiveSessionResponse(
            ParkingSession session
    ) {
        if (
                session == null
                        || session.getVehicle() == null
                        || session
                        .getVehicle()
                        .getVehicleType() == null
                        || session.getSlot() == null
        ) {
            throw new RuntimeException(
                    "Invalid active parking session data"
            );
        }

        return ActiveParkingSessionResponse.builder()
                .sessionId(
                        session.getId()
                )
                .ticketId(
                        session.getTicketId()
                )
                .licensePlate(
                        session
                                .getVehicle()
                                .getLicensePlate()
                )
                .vehicleType(
                        session
                                .getVehicle()
                                .getVehicleType()
                                .getTypeName()
                )
                .slotCode(
                        session
                                .getSlot()
                                .getSlotCode()
                )
                .checkInTime(
                        session.getCheckInTime()
                )
                .status(
                        session.getStatus()
                )
                .build();
    }

    /**
     * Kiểm tra session trước khi tính phí.
     */
    private void validateSessionForPricing(
            ParkingSession session,
            LocalDateTime checkOutTime
    ) {
        if (session == null) {
            throw new RuntimeException(
                    "Parking session not found"
            );
        }

        if (
                session.getCheckInTime() == null
        ) {
            throw new RuntimeException(
                    "Parking session does not have check-in time"
            );
        }

        if (checkOutTime == null) {
            throw new RuntimeException(
                    "Checkout time is required"
            );
        }

        if (
                session.getVehicle() == null
                        || session
                        .getVehicle()
                        .getVehicleType() == null
                        || session
                        .getVehicle()
                        .getVehicleType()
                        .getId() == null
        ) {
            throw new RuntimeException(
                    "Parking session does not have valid vehicle information"
            );
        }

        if (
                session.getSlot() == null
        ) {
            throw new RuntimeException(
                    "Parking session does not have a parking slot"
            );
        }
    }

    /**
     * Kiểm tra dữ liệu check-in.
     */
    private void validateCheckInRequest(
            CheckInRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Check-in request is required"
            );
        }

        if (
                request.getLicensePlate() == null
                        || request
                        .getLicensePlate()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "License plate is required"
            );
        }

        if (
                request.getVehicleTypeId() == null
                        || request.getVehicleTypeId() <= 0
        ) {
            throw new RuntimeException(
                    "Vehicle type is required"
            );
        }
    }

    /**
     * Xác định phương thức thanh toán hợp lệ.
     */
    private String resolvePaymentMethod(
            String requestedPaymentMethod,
            BigDecimal amountDue,
            boolean prepaidBooking
    ) {
        BigDecimal normalizedAmount =
                safeMoney(
                        amountDue
                );

        if (
                normalizedAmount.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            if (prepaidBooking) {
                return PAYMENT_METHOD_PREPAID;
            }

            return PAYMENT_METHOD_CASH;
        }

        String paymentMethod =
                normalizeStatus(
                        requestedPaymentMethod
                );

        if (paymentMethod.isBlank()) {
            paymentMethod =
                    PAYMENT_METHOD_CASH;
        }

        if (
                !SUPPORTED_PAYMENT_METHODS.contains(
                        paymentMethod
                )
        ) {
            throw new RuntimeException(
                    "Unsupported payment method"
            );
        }

        if (
                PAYMENT_METHOD_PREPAID.equals(
                        paymentMethod
                )
        ) {
            throw new RuntimeException(
                    "Prepaid booking cannot be used when an additional payment is required"
            );
        }

        return paymentMethod;
    }

    /**
     * Lưu thời gian trong database theo UTC.
     *
     * Frontend chịu trách nhiệm chuyển UTC sang
     * Asia/Ho_Chi_Minh khi hiển thị.
     *
     * Cách này giữ tương thích với các session cũ
     * đã được Azure lưu theo UTC và tránh cộng lệch 7 giờ
     * khi tính duration/overstay.
     */
    private LocalDateTime currentUtcDateTime() {
        return LocalDateTime.now(
                ZoneOffset.UTC
        );
    }

    /**
     * Chuẩn hóa giá trị tiền và không cho số âm.
     */
    private BigDecimal safeMoney(
            BigDecimal value
    ) {
        if (
                value == null
                        || value.compareTo(
                        BigDecimal.ZERO
                ) < 0
        ) {
            return zeroMoney();
        }

        return value.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal zeroMoney() {
        return BigDecimal.ZERO.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private String normalizeTicketId(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return null;
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private String normalizeLicensePlate(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return null;
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private String normalizePlateForCompare(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                )
                .replaceAll(
                        "[^A-Z0-9]",
                        ""
                );
    }

    private String normalizeStatus(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return "";
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    /**
     * Lấy tài khoản đang đăng nhập từ JWT/Spring Security.
     *
     * Không nhận userId từ request frontend.
     */
    private User getCurrentAuthenticatedUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication.isAuthenticated()
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
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authenticated user not found"
                        )
                );
    }

    /**
     * Tạo notification riêng cho tài khoản
     * vừa thực hiện check-in.
     */
    private void createCheckInNotification(
            User currentOperator,
            ParkingSession session
    ) {
        if (
                currentOperator == null
                        || currentOperator.getId() == null
                        || session == null
        ) {
            return;
        }

        String licensePlate =
                getSessionLicensePlate(
                        session
                );

        String slotCode =
                getSessionSlotCode(
                        session
                );

        String ticketId =
                session.getTicketId() == null
                        || session
                        .getTicketId()
                        .isBlank()
                        ? "N/A"
                        : session.getTicketId();

        String message =
                "Vehicle "
                        + licensePlate
                        + " was checked in successfully at slot "
                        + slotCode
                        + ". Ticket: "
                        + ticketId
                        + ".";

        notificationService
                .createPersonalNotification(
                        currentOperator.getId(),
                        "Vehicle checked in",
                        message,
                        NOTIFICATION_VEHICLE_CHECKED_IN
                );
    }

    /**
     * Tạo notification riêng cho tài khoản
     * vừa thực hiện checkout.
     */
    private void createCheckOutNotification(
            User currentOperator,
            ParkingSession session,
            CheckOutResponse response,
            String paymentMethod
    ) {
        if (
                currentOperator == null
                        || currentOperator.getId() == null
                        || session == null
                        || response == null
        ) {
            return;
        }

        String licensePlate =
                getSessionLicensePlate(
                        session
                );

        String slotCode =
                getSessionSlotCode(
                        session
                );

        BigDecimal paidAmount =
                safeMoney(
                        response.getAmountDue()
                );

        String safePaymentMethod =
                paymentMethod == null
                        || paymentMethod.isBlank()
                        ? "N/A"
                        : paymentMethod;

        String message =
                "Vehicle "
                        + licensePlate
                        + " was checked out successfully from slot "
                        + slotCode
                        + ". Amount paid: "
                        + paidAmount.toPlainString()
                        + " VND. Payment method: "
                        + safePaymentMethod
                        + ".";

        notificationService
                .createPersonalNotification(
                        currentOperator.getId(),
                        "Vehicle checked out",
                        message,
                        NOTIFICATION_VEHICLE_CHECKED_OUT
                );
    }

    /**
     * Lấy biển số an toàn từ session.
     */
    private String getSessionLicensePlate(
            ParkingSession session
    ) {
        if (
                session == null
                        || session.getVehicle() == null
                        || session
                        .getVehicle()
                        .getLicensePlate() == null
                        || session
                        .getVehicle()
                        .getLicensePlate()
                        .isBlank()
        ) {
            return "N/A";
        }

        return session
                .getVehicle()
                .getLicensePlate();
    }

    /**
     * Lấy mã slot an toàn từ session.
     */
    private String getSessionSlotCode(
            ParkingSession session
    ) {
        if (
                session == null
                        || session.getSlot() == null
                        || session
                        .getSlot()
                        .getSlotCode() == null
                        || session
                        .getSlot()
                        .getSlotCode()
                        .isBlank()
        ) {
            return "N/A";
        }

        return session
                .getSlot()
                .getSlotCode();
    }

    /**
     * Sinh ticket ID không trùng.
     */
    private String generateUniqueTicketId() {
        for (
                int attempt = 0;
                attempt < MAX_TICKET_GENERATION_ATTEMPTS;
                attempt++
        ) {
            int number =
                    ThreadLocalRandom
                            .current()
                            .nextInt(
                                    100000,
                                    1000000
                            );

            String ticketId =
                    "TK-" + number;

            if (
                    !parkingSessionRepository
                            .existsByTicketId(
                                    ticketId
                            )
            ) {
                return ticketId;
            }
        }

        throw new RuntimeException(
                "Cannot generate a unique parking ticket"
        );
    }
}