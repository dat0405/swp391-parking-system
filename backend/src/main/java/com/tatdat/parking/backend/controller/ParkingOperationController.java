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
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.HolidayRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/parking-operations")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"
        },
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.PATCH,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        },
        allowCredentials = "true"
)
public class ParkingOperationController {

    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final PaymentRepository paymentRepository;
    private final HolidayRepository holidayRepository;
    private final BookingRepository bookingRepository;

    private static final BigDecimal LOST_TICKET_FEE = new BigDecimal("10000.00");

    private final Random random = new Random();

    @PostMapping("/check-in")
    @Transactional
    public CheckInResponse checkIn(@RequestBody CheckInRequest request) {
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new RuntimeException("License plate is required");
        }

        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        String licensePlate = request.getLicensePlate().trim().toUpperCase();
        LocalDateTime now = LocalDateTime.now();

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("Vehicle type not found"));

        Vehicle vehicle = vehicleRepository.findByLicensePlate(licensePlate)
                .orElseGet(() -> {
                    Vehicle newVehicle = new Vehicle();
                    newVehicle.setLicensePlate(licensePlate);
                    newVehicle.setVehicleType(vehicleType);
                    return vehicleRepository.save(newVehicle);
                });

        if (!vehicle.getVehicleType().getId().equals(vehicleType.getId())) {
            throw new RuntimeException("Vehicle type does not match this license plate");
        }

        parkingSessionRepository
                .findFirstByVehicle_LicensePlateAndStatus(licensePlate, "ACTIVE")
                .ifPresent(existingSession -> {
                    throw new RuntimeException("Vehicle is already checked in");
                });

        Booking validBooking = findValidBookingForCheckIn(licensePlate, now);

        ParkingSlot slot;

        if (validBooking != null) {
            slot = validBooking.getSlot();

            if (slot == null) {
                throw new RuntimeException("Booking does not have a parking slot");
            }

            if (slot.getVehicleType() != null
                    && !slot.getVehicleType().getId().equals(request.getVehicleTypeId())) {
                throw new RuntimeException("Booking slot does not match this vehicle type");
            }

            if ("OCCUPIED".equalsIgnoreCase(slot.getStatus())) {
                throw new RuntimeException("Booking slot is currently occupied");
            }

            if ("MAINTENANCE".equalsIgnoreCase(slot.getStatus())) {
                throw new RuntimeException("Booking slot is currently under maintenance");
            }
        } else {
            /*
             * Walk-in customer:
             * The staff does not select a floor anymore.
             * The system automatically finds the first AVAILABLE slot
             * for the selected vehicle type.
             *
             * This automatically skips:
             * - RESERVED
             * - OCCUPIED
             * - MAINTENANCE
             */
            slot = findFirstAvailableSlotForWalkIn(request.getVehicleTypeId());
        }

        String ticketId = generateUniqueTicketId();

        ParkingSession savedSession = parkingSessionRepository.save(
                ParkingSession.builder()
                        .ticketId(ticketId)
                        .vehicle(vehicle)
                        .slot(slot)
                        .booking(validBooking)
                        .checkInTime(now)
                        .status("ACTIVE")
                        .build()
        );

        /*
         * Booking flow: RESERVED -> OCCUPIED.
         * Walk-in flow: AVAILABLE -> OCCUPIED.
         */
        slot.setStatus("OCCUPIED");
        parkingSlotRepository.save(slot);

        if (validBooking != null) {
            validBooking.setStatus(Booking.STATUS_CHECKED_IN);
            validBooking.setCheckedInAt(now);
            bookingRepository.save(validBooking);
        }

        return CheckInResponse.builder()
                .sessionId(savedSession.getId())
                .ticketId(savedSession.getTicketId())
                .licensePlate(vehicle.getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(savedSession.getCheckInTime())
                .status(savedSession.getStatus())
                .build();
    }

    @GetMapping("/check-out/search")
    @Transactional(readOnly = true)
    public CheckOutResponse searchCheckOut(
            @RequestParam(required = false) String ticketId,
            @RequestParam(required = false) String licensePlate,
            @RequestParam(required = false, defaultValue = "false") Boolean lostTicket
    ) {
        CheckOutRequest request = new CheckOutRequest();
        request.setTicketId(ticketId);
        request.setLicensePlate(licensePlate);
        request.setLostTicket(Boolean.TRUE.equals(lostTicket));

        ParkingSession session = findActiveSessionForCheckout(request);

        return buildCheckOutPreview(session, Boolean.TRUE.equals(request.getLostTicket()));
    }

    @PostMapping("/check-out")
    @Transactional
    public CheckOutResponse checkOut(@RequestBody CheckOutRequest request) {
        ParkingSession session = findActiveSessionForCheckout(request);

        CheckOutResponse preview = buildCheckOutPreview(session, Boolean.TRUE.equals(request.getLostTicket()));

        LocalDateTime checkOutTime = LocalDateTime.now();

        session.setCheckOutTime(checkOutTime);
        session.setStatus("COMPLETED");
        parkingSessionRepository.save(session);

        Booking booking = session.getBooking();

        if (booking != null) {
            booking.setStatus(Booking.STATUS_COMPLETED);
            booking.setCheckedOutAt(checkOutTime);
            bookingRepository.save(booking);
        }

        ParkingSlot slot = session.getSlot();
        slot.setStatus("AVAILABLE");
        parkingSlotRepository.save(slot);

        boolean prepaidBooking = Boolean.TRUE.equals(preview.getPrepaidBooking());
        BigDecimal amountDue = safeMoney(preview.getAmountDue());

        /*
         * Revenue rule:
         * - Walk-in customer: create Payment for the full checkout amount.
         * - Prepaid booking, no overstay: amountDue = 0, do not create Payment.
         * - Prepaid booking, overstay: amountDue > 0, create Payment only for the extra overstay fee.
         *
         * This avoids charging the original booking fee twice, while still collecting
         * extra money when the customer leaves after the booked end time.
         */
        if (amountDue.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = Payment.builder()
                    .parkingSession(session)
                    .amount(amountDue)
                    .paymentMethod(
                            request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()
                                    ? "CASH"
                                    : request.getPaymentMethod().trim().toUpperCase()
                    )
                    .paymentStatus("PAID")
                    .paymentTime(checkOutTime)
                    .build();

            paymentRepository.save(payment);
        }

        return CheckOutResponse.builder()
                .sessionId(session.getId())
                .ticketId(session.getTicketId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .slotCode(slot.getSlotCode())
                .checkInTime(session.getCheckInTime())
                .checkOutTime(checkOutTime)
                .durationHours(preview.getDurationHours())
                .pricePerHour(preview.getPricePerHour())
                .parkingFee(preview.getParkingFee())
                .overtimeFee(preview.getOvertimeFee())
                .overstayFee(preview.getOverstayFee())
                .holidayName(preview.getHolidayName())
                .holidaySurcharge(preview.getHolidaySurcharge())
                .lostTicket(Boolean.TRUE.equals(preview.getLostTicket()))
                .lostTicketFee(preview.getLostTicketFee())
                .totalAmount(preview.getTotalAmount())
                .prepaidBooking(prepaidBooking)
                .amountDue(amountDue)
                .paymentStatus(
                        prepaidBooking && amountDue.compareTo(BigDecimal.ZERO) <= 0
                                ? "PAID_BY_BOOKING"
                                : "PAID"
                )
                .build();
    }

    @GetMapping("/active")
    public List<ActiveParkingSessionResponse> getActiveParkingSessions() {
        return parkingSessionRepository
                .findByStatusOrderByCheckInTimeDesc("ACTIVE")
                .stream()
                .map(session -> ActiveParkingSessionResponse.builder()
                        .sessionId(session.getId())
                        .ticketId(session.getTicketId())
                        .licensePlate(session.getVehicle().getLicensePlate())
                        .vehicleType(session.getVehicle().getVehicleType().getTypeName())
                        .slotCode(session.getSlot().getSlotCode())
                        .checkInTime(session.getCheckInTime())
                        .status(session.getStatus())
                        .build())
                .toList();
    }

    @GetMapping("/floor-stats")
    public List<ParkingFloorStatsResponse> getParkingFloorStats() {
        return parkingSlotRepository.getParkingFloorStats();
    }

    private CheckOutResponse buildCheckOutPreview(ParkingSession session, boolean lostTicket) {
        LocalDateTime currentTime = LocalDateTime.now();

        long minutes = Duration.between(session.getCheckInTime(), currentTime).toMinutes();
        long durationHours = (long) Math.ceil(minutes / 60.0);

        if (durationHours <= 0) {
            durationHours = 1;
        }

        Integer vehicleTypeId = session.getVehicle().getVehicleType().getId();

        PricingPolicy pricingPolicy = pricingPolicyRepository
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
                .orElseThrow(() -> new RuntimeException("Active pricing policy not found"));

        BigDecimal pricePerHour = safeMoney(pricingPolicy.getPricePerHour());
        BigDecimal policyOvertimeFee = safeMoney(pricingPolicy.getOvertimeFee());
        BigDecimal policyOverstayFee = safeMoney(pricingPolicy.getOverstayFee());

        BigDecimal parkingFee = pricePerHour
                .multiply(BigDecimal.valueOf(durationHours))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal overtimeFee = calculateOvertimeFee(
                session.getCheckInTime(),
                currentTime,
                policyOvertimeFee
        );

        BigDecimal overstayFee = calculateBookingOverstayFee(
                session.getBooking(),
                currentTime,
                policyOverstayFee
        );

        boolean prepaidBooking = isPrepaidBooking(session.getBooking());

        /*
         * Prepaid booking rule:
         * - The customer already paid the booked parking time in the booking QR flow.
         * - Do not charge parkingFee again.
         * - Do not charge overtimeFee again.
         * - Keep overstayFee if checkoutTime is after booking.endTime.
         * - If customer lost ticket, still charge lost ticket fee.
         */
        if (prepaidBooking) {
            overtimeFee = BigDecimal.ZERO;
        }

        Holiday holiday = prepaidBooking ? null : findActiveHoliday(currentTime.toLocalDate());

        BigDecimal subtotalBeforeHoliday = prepaidBooking
                ? overstayFee.setScale(2, RoundingMode.HALF_UP)
                : parkingFee
                .add(overtimeFee)
                .add(overstayFee)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal holidaySurcharge = calculateHolidaySurcharge(
                subtotalBeforeHoliday,
                holiday
        );

        /*
         * Lost-ticket fee is a fixed penalty and is not affected by holiday surcharge.
         */
        BigDecimal lostTicketFee = lostTicket
                ? LOST_TICKET_FEE.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalAmount = subtotalBeforeHoliday
                .add(holidaySurcharge)
                .add(lostTicketFee)
                .setScale(2, RoundingMode.HALF_UP);

        return CheckOutResponse.builder()
                .sessionId(session.getId())
                .ticketId(session.getTicketId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .slotCode(session.getSlot().getSlotCode())
                .checkInTime(session.getCheckInTime())
                .checkOutTime(currentTime)
                .durationHours(durationHours)
                .pricePerHour(pricePerHour)
                .parkingFee(parkingFee)
                .overtimeFee(overtimeFee)
                .overstayFee(overstayFee)
                .holidayName(holiday == null ? null : holiday.getHolidayName())
                .holidaySurcharge(holidaySurcharge)
                .lostTicket(lostTicket)
                .lostTicketFee(lostTicketFee)
                .totalAmount(totalAmount)
                .prepaidBooking(prepaidBooking)
                .amountDue(totalAmount)
                .paymentStatus(
                        prepaidBooking && totalAmount.compareTo(BigDecimal.ZERO) <= 0
                                ? "PAID_BY_BOOKING"
                                : "PENDING"
                )
                .build();
    }

    private Booking findValidBookingForCheckIn(String licensePlate, LocalDateTime now) {
        if (licensePlate == null || licensePlate.isBlank()) {
            return null;
        }

        List<Booking> validBookings = bookingRepository.findValidConfirmedBookingsForCheckIn(
                licensePlate.trim().toUpperCase(),
                now
        );

        if (validBookings == null || validBookings.isEmpty()) {
            return null;
        }

        return validBookings.get(0);
    }

    private ParkingSlot findFirstAvailableSlotForWalkIn(Integer vehicleTypeId) {
        /*
         * Walk-in auto assignment:
         * Use repository query instead of findAll() so the database returns
         * only AVAILABLE slots, ordered from the first floor to the last floor.
         */
        return parkingSlotRepository.findAvailableSlotsForAutoCheckIn(vehicleTypeId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No available slot for this vehicle type"));
    }

    private boolean isPrepaidBooking(Booking booking) {
        if (booking == null) {
            return false;
        }

        String paymentStatus = booking.getPaymentStatus();
        String bookingStatus = booking.getStatus();

        return "PAID".equalsIgnoreCase(paymentStatus)
                || "CONFIRMED".equalsIgnoreCase(bookingStatus)
                || Booking.STATUS_CHECKED_IN.equalsIgnoreCase(bookingStatus)
                || Booking.STATUS_COMPLETED.equalsIgnoreCase(bookingStatus);
    }

    private BigDecimal calculateBookingOverstayFee(
            Booking booking,
            LocalDateTime checkOutTime,
            BigDecimal policyOverstayFee
    ) {
        if (booking == null || booking.getEndTime() == null || checkOutTime == null) {
            return BigDecimal.ZERO;
        }

        if (policyOverstayFee == null || policyOverstayFee.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (!checkOutTime.isAfter(booking.getEndTime())) {
            return BigDecimal.ZERO;
        }

        long overstayMinutes = Duration.between(booking.getEndTime(), checkOutTime).toMinutes();
        long overstayHours = (long) Math.ceil(overstayMinutes / 60.0);

        if (overstayHours <= 0) {
            return BigDecimal.ZERO;
        }

        return policyOverstayFee
                .multiply(BigDecimal.valueOf(overstayHours))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateOvertimeFee(
            LocalDateTime checkInTime,
            LocalDateTime checkOutTime,
            BigDecimal policyOvertimeFee
    ) {
        if (checkInTime == null || checkOutTime == null) {
            return BigDecimal.ZERO;
        }

        if (policyOvertimeFee == null || policyOvertimeFee.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        LocalDate checkInDate = checkInTime.toLocalDate();
        LocalDate checkOutDate = checkOutTime.toLocalDate();

        long overnightDays = ChronoUnit.DAYS.between(checkInDate, checkOutDate);

        if (overnightDays <= 0) {
            return BigDecimal.ZERO;
        }

        return policyOvertimeFee
                .multiply(BigDecimal.valueOf(overnightDays))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Holiday findActiveHoliday(LocalDate date) {
        if (date == null) {
            return null;
        }

        return holidayRepository.findByHolidayDateAndIsActiveTrue(date)
                .orElse(null);
    }

    private BigDecimal calculateHolidaySurcharge(
            BigDecimal subtotalBeforeHoliday,
            Holiday holiday
    ) {
        if (subtotalBeforeHoliday == null || subtotalBeforeHoliday.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (holiday == null) {
            return BigDecimal.ZERO;
        }

        if (holiday.getSurchargeValue() == null || holiday.getSurchargeValue().compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        String surchargeType = holiday.getSurchargeType() == null
                ? "PERCENT"
                : holiday.getSurchargeType().trim().toUpperCase();

        if ("FIXED".equals(surchargeType)) {
            return holiday.getSurchargeValue()
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return subtotalBeforeHoliday
                .multiply(holiday.getSurchargeValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private ParkingSession findActiveSessionForCheckout(CheckOutRequest request) {
        if (request == null) {
            throw new RuntimeException("Checkout request is required");
        }

        String ticketId = normalizeTicketId(request.getTicketId());
        String scannedLicensePlate = normalizeLicensePlate(request.getLicensePlate());
        boolean lostTicket = Boolean.TRUE.equals(request.getLostTicket());

        /*
         * Security rule for checkout:
         *
         * NORMAL checkout:
         * - Must have scanned exit license plate.
         * - Must have QR Ticket / ticketId.
         * - Ticket session license plate must match scanned exit license plate.
         *
         * LOST TICKET / QR broken fallback:
         * - Must still have scanned exit license plate.
         * - If ticketId is supplied from active list, it must match the scanned plate.
         * - If ticketId is not supplied, backend finds the active session by scanned plate.
         *
         * This prevents staff/frontend/API callers from checking out a vehicle
         * by ticketId alone or by clicking an active-session card without scanning
         * the vehicle at the exit gate.
         */
        if (scannedLicensePlate == null || scannedLicensePlate.isBlank()) {
            throw new RuntimeException("Scanned license plate is required for checkout");
        }

        if (!lostTicket && (ticketId == null || ticketId.isBlank())) {
            throw new RuntimeException("QR Ticket is required for normal checkout");
        }

        ParkingSession session;

        if (ticketId != null && !ticketId.isBlank()) {
            session = parkingSessionRepository
                    .findFirstByTicketIdAndStatus(ticketId, "ACTIVE")
                    .orElseThrow(() -> new RuntimeException("Active parking session not found"));
        } else {
            session = parkingSessionRepository
                    .findFirstByVehicle_LicensePlateAndStatus(scannedLicensePlate, "ACTIVE")
                    .orElseThrow(() -> new RuntimeException("Active parking session not found"));
        }

        assertScannedPlateMatchesSession(session, scannedLicensePlate, lostTicket);

        return session;
    }

    private void assertScannedPlateMatchesSession(
            ParkingSession session,
            String scannedLicensePlate,
            boolean lostTicket
    ) {
        if (session == null || session.getVehicle() == null) {
            throw new RuntimeException("Active parking session not found");
        }

        String sessionLicensePlate = normalizeLicensePlate(session.getVehicle().getLicensePlate());

        if (sessionLicensePlate == null || sessionLicensePlate.isBlank()) {
            throw new RuntimeException("Parking session does not have a license plate");
        }

        if (!normalizePlateForCompare(sessionLicensePlate).equals(normalizePlateForCompare(scannedLicensePlate))) {
            if (lostTicket) {
                throw new RuntimeException("Selected vehicle does not match scanned license plate");
            }

            throw new RuntimeException("QR Ticket does not match scanned license plate");
        }
    }

    private String normalizeTicketId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim().toUpperCase();
    }

    private String normalizeLicensePlate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim().toUpperCase();
    }

    private String normalizePlateForCompare(String value) {
        return String.valueOf(value == null ? "" : value)
                .trim()
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "");
    }

    private String generateUniqueTicketId() {
        String ticketId;

        do {
            int number = 100000 + random.nextInt(900000);
            ticketId = "TK-" + number;
        } while (parkingSessionRepository.existsByTicketId(ticketId));

        return ticketId;
    }
}