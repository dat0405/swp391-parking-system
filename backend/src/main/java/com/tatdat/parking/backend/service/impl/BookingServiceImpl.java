package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.BookingHistoryResponse;
import com.tatdat.parking.backend.dto.BookingResponse;
import com.tatdat.parking.backend.dto.CreateBookingRequest;
import com.tatdat.parking.backend.dto.UpdateBookingVehicleDTO;
import com.tatdat.parking.backend.entity.Booking;
import com.tatdat.parking.backend.entity.BookingHistory;
import com.tatdat.parking.backend.entity.ParkingSlot;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.BookingHistoryRepository;
import com.tatdat.parking.backend.repository.BookingRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.repository.VehicleRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.BookingService;
import com.tatdat.parking.backend.service.PayOSPaymentLinkManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private static final int PAYMENT_TIMEOUT_MINUTES = 10;

    private static final String SLOT_STATUS_AVAILABLE = "AVAILABLE";
    private static final String SLOT_STATUS_RESERVED = "RESERVED";
    private static final String SLOT_STATUS_OCCUPIED = "OCCUPIED";
    private static final String SLOT_STATUS_MAINTENANCE = "MAINTENANCE";

    private final BookingRepository bookingRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final UserRepository userRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final PayOSPaymentLinkManager payOSPaymentLinkManager;

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByBookingTimeDesc()
                .stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Integer bookingId) {
        return BookingResponse.fromEntity(
                findBookingOrThrow(bookingId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingHistoryResponse> getMyBookingHistory() {
        User currentUser = getCurrentAuthenticatedUser();

        return bookingRepository
                .findByUserIdOrderByBookingTimeDesc(
                        currentUser.getId()
                )
                .stream()
                .map(BookingHistoryResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public BookingHistoryResponse getMyBookingHistoryDetail(
            Integer bookingId
    ) {
        User currentUser = getCurrentAuthenticatedUser();

        Booking booking = findBookingOwnedByUserOrThrow(
                bookingId,
                currentUser.getId()
        );

        String bookingStatus = normalizeStatus(
                booking.getStatus()
        );

        String paymentStatus = normalizePaymentStatus(
                booking.getPaymentStatus()
        );

        /*
         * This also keeps the slot state synchronized when a PayOS
         * webhook has already marked the payment as PAID/CONFIRMED.
         */
        boolean paidPendingBooking =
                Booking.PAYMENT_STATUS_PAID.equals(paymentStatus)
                        && Booking.STATUS_PENDING_PAYMENT.equals(
                        bookingStatus
                );

        if (Booking.STATUS_CONFIRMED.equals(bookingStatus)
                || paidPendingBooking) {

            synchronizeConfirmedBookingState(booking);
        }

        return BookingHistoryResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public Optional<BookingHistoryResponse> getMyPendingPayment() {
        User currentUser = getCurrentAuthenticatedUser();
        LocalDateTime now = LocalDateTime.now();

        /*
         * Do not wait for the scheduler when the user reloads this page.
         * Expired bookings are converted immediately before looking for
         * an active pending-payment transaction.
         */
        expirePendingBookingsInternal(now);

        return bookingRepository
                .findActivePendingPaymentsByUser(
                        currentUser.getId(),
                        now
                )
                .stream()
                .findFirst()
                .map(BookingHistoryResponse::fromEntity);
    }

    @Override
    @Transactional
    public BookingHistoryResponse cancelMyBooking(
            Integer bookingId
    ) {
        User currentUser = getCurrentAuthenticatedUser();

        Booking booking = findBookingOwnedByUserOrThrow(
                bookingId,
                currentUser.getId()
        );

        String currentStatus = normalizeStatus(
                booking.getStatus()
        );

        if (Booking.STATUS_CANCELLED.equals(currentStatus)) {
            return BookingHistoryResponse.fromEntity(booking);
        }

        boolean paymentAlreadyPaid =
                Booking.PAYMENT_STATUS_PAID.equalsIgnoreCase(
                        normalizePaymentStatus(
                                booking.getPaymentStatus()
                        )
                );

        if (paymentAlreadyPaid
                || Booking.STATUS_CONFIRMED.equals(currentStatus)
                || Booking.STATUS_CHECKED_IN.equals(currentStatus)
                || Booking.STATUS_COMPLETED.equals(currentStatus)
                || Booking.STATUS_REFUNDED.equals(currentStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Paid or active booking cannot be cancelled from the payment screen"
            );
        }

        if (!Booking.STATUS_PENDING_PAYMENT.equals(currentStatus)
                && !Booking.STATUS_EXPIRED.equals(currentStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending payment booking can be cancelled"
            );
        }

        payOSPaymentLinkManager.cancelPaymentLinkSilently(
                booking,
                "User cancelled booking"
        );

        booking.setStatus(Booking.STATUS_CANCELLED);
        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_CANCELLED
        );
        booking.setCancelledAt(LocalDateTime.now());

        releaseReservedSlotIfNeeded(
                booking.getSlot()
        );

        Booking savedBooking =
                bookingRepository.save(booking);

        return BookingHistoryResponse.fromEntity(
                savedBooking
        );
    }

    @Override
    @Transactional
    public BookingResponse createBooking(
            CreateBookingRequest request
    ) {
        validateCreateBookingRequest(request);

        /*
         * Do not trust userId from the frontend.
         * The owner is always the authenticated user.
         */
        User user = getCurrentAuthenticatedUser();
        LocalDateTime now = LocalDateTime.now();

        expirePendingBookingsInternal(now);

        List<Booking> activePendingPayments =
                bookingRepository.findActivePendingPaymentsByUser(
                        user.getId(),
                        now
                );

        if (!activePendingPayments.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bạn đang có một booking chờ thanh toán. Vui lòng tiếp tục hoặc hủy giao dịch đó trước."
            );
        }

        VehicleType vehicleType =
                vehicleTypeRepository
                        .findById(request.getVehicleTypeId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Vehicle type not found"
                                )
                        );

        ParkingSlot slot =
                parkingSlotRepository
                        .findById(request.getSlotId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Parking slot not found"
                                )
                        );

        validateSlotForBooking(
                slot,
                vehicleType,
                request
        );

        String normalizedPlate =
                normalizeLicensePlate(
                        request.getLicensePlate()
                );

        Vehicle vehicle =
                vehicleRepository
                        .findByLicensePlateIgnoreCase(
                                normalizedPlate
                        )
                        .orElseGet(() -> {
                            Vehicle newVehicle =
                                    Vehicle.builder()
                                            .user(user)
                                            .vehicleType(vehicleType)
                                            .licensePlate(normalizedPlate)
                                            .color(
                                                    normalizeNullableText(
                                                            request.getColor()
                                                    )
                                            )
                                            .createdAt(
                                                    LocalDateTime.now()
                                            )
                                            .build();

                            return vehicleRepository.save(
                                    newVehicle
                            );
                        });

        if (vehicle.getUser() != null
                && vehicle.getUser().getId() != null
                && !vehicle.getUser().getId().equals(user.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This license plate belongs to another user"
            );
        }

        if (vehicle.getUser() == null) {
            vehicle.setUser(user);
        }

        if (vehicle.getVehicleType() == null
                || !vehicle.getVehicleType()
                .getId()
                .equals(vehicleType.getId())) {

            vehicle.setVehicleType(vehicleType);
        }

        if (request.getColor() != null
                && !request.getColor().trim().isEmpty()) {

            vehicle.setColor(
                    request.getColor().trim()
            );
        }

        vehicleRepository.save(vehicle);

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .slot(slot)
                .bookingTime(now)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(
                        Booking.STATUS_PENDING_PAYMENT
                )
                .paymentStatus(
                        Booking.PAYMENT_STATUS_PENDING
                )
                .paymentCurrency("VND")
                .paymentExpiredAt(
                        now.plusMinutes(
                                PAYMENT_TIMEOUT_MINUTES
                        )
                )
                .build();

        Booking savedBooking =
                bookingRepository.save(booking);

        /*
         * Important:
         * The slot stays AVAILABLE while payment is pending.
         * It becomes RESERVED only after successful payment.
         */
        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse updateVehicleInfo(
            Integer bookingId,
            UpdateBookingVehicleDTO dto
    ) {
        Booking booking = findBookingOrThrow(bookingId);
        Vehicle vehicle = booking.getVehicle();

        if (vehicle == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Booking has no vehicle assigned"
            );
        }

        if (dto == null || dto.getHandledByUserId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Handled by user ID is required"
            );
        }

        User staff = userRepository
                .findById(dto.getHandledByUserId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Staff not found"
                        )
                );

        BookingHistory history =
                BookingHistory.builder()
                        .vehicle(vehicle)
                        .licensePlate(
                                vehicle.getLicensePlate()
                        )
                        .color(vehicle.getColor())
                        .updatedAt(LocalDateTime.now())
                        .updatedBy(staff.getFullName())
                        .reason(dto.getReason())
                        .build();

        bookingHistoryRepository.save(history);

        if (dto.getLicensePlate() != null) {
            String newPlate =
                    normalizeLicensePlate(
                            dto.getLicensePlate()
                    );

            vehicleRepository
                    .findByLicensePlateIgnoreCase(
                            newPlate
                    )
                    .ifPresent(existingVehicle -> {
                        if (!existingVehicle.getId()
                                .equals(vehicle.getId())) {

                            throw new ResponseStatusException(
                                    HttpStatus.CONFLICT,
                                    "License plate already exists"
                            );
                        }
                    });

            vehicle.setLicensePlate(newPlate);
        }

        if (dto.getColor() != null) {
            String newColor =
                    dto.getColor().trim();

            if (newColor.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Color cannot be empty"
                );
            }

            vehicle.setColor(newColor);
        }

        vehicleRepository.save(vehicle);

        return BookingResponse.fromEntity(
                findBookingOrThrow(bookingId)
        );
    }

    @Override
    @Transactional
    public BookingResponse confirmBooking(
            Integer bookingId
    ) {
        Booking booking = findBookingOrThrow(bookingId);

        String currentStatus = normalizeStatus(
                booking.getStatus()
        );

        if (Booking.STATUS_CANCELLED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cancelled booking cannot be confirmed"
            );
        }

        if (Booking.STATUS_COMPLETED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Completed booking cannot be confirmed again"
            );
        }

        if (Booking.STATUS_EXPIRED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Expired booking cannot be confirmed"
            );
        }

        if (Booking.STATUS_NO_SHOW.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No-show booking cannot be confirmed"
            );
        }

        if (Booking.STATUS_REFUNDED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Refunded booking cannot be confirmed"
            );
        }

        if (Booking.STATUS_CONFIRMED.equals(currentStatus)) {
            synchronizeConfirmedBookingState(booking);

            return BookingResponse.fromEntity(booking);
        }

        if (!Booking.STATUS_PENDING_PAYMENT.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending payment booking can be confirmed"
            );
        }

        if (booking.getPaymentExpiredAt() != null
                && !LocalDateTime.now().isBefore(
                booking.getPaymentExpiredAt()
        )) {
            expireBookingAsPaymentTimeout(
                    booking,
                    LocalDateTime.now()
            );

            bookingRepository.save(booking);

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Payment time expired. Booking was cancelled automatically."
            );
        }

        List<Booking> overlappingBookings =
                bookingRepository
                        .findOverlappingBookings(
                                booking.getSlot().getId(),
                                booking.getStartTime(),
                                booking.getEndTime()
                        )
                        .stream()
                        .filter(item ->
                                !item.getId().equals(
                                        booking.getId()
                                )
                        )
                        .toList();

        if (!overlappingBookings.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot is already reserved in this time range"
            );
        }

        booking.setStatus(
                Booking.STATUS_CONFIRMED
        );

        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_PAID
        );

        if (booking.getPaidAt() == null) {
            booking.setPaidAt(
                    LocalDateTime.now()
            );
        }

        Booking savedBooking =
                bookingRepository.save(booking);

        /*
         * The slot becomes RESERVED only after the booking
         * has been successfully paid and confirmed.
         */
        reserveSlotAfterPayment(
                savedBooking.getSlot()
        );

        return BookingResponse.fromEntity(
                savedBooking
        );
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(
            Integer bookingId
    ) {
        Booking booking = findBookingOrThrow(bookingId);

        String currentStatus = normalizeStatus(
                booking.getStatus()
        );

        if (Booking.STATUS_COMPLETED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Completed booking cannot be cancelled"
            );
        }

        if (Booking.STATUS_CANCELLED.equals(currentStatus)) {
            return BookingResponse.fromEntity(booking);
        }

        if (Booking.STATUS_REFUNDED.equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Refunded booking cannot be cancelled"
            );
        }

        payOSPaymentLinkManager.cancelPaymentLinkSilently(
                booking,
                "Booking cancelled by staff"
        );

        booking.setStatus(
                Booking.STATUS_CANCELLED
        );

        if (!Booking.PAYMENT_STATUS_PAID.equalsIgnoreCase(
                normalizePaymentStatus(
                        booking.getPaymentStatus()
                )
        )) {
            booking.setPaymentStatus(
                    Booking.PAYMENT_STATUS_CANCELLED
            );
        }

        booking.setCancelledAt(
                LocalDateTime.now()
        );

        releaseReservedSlotIfNeeded(
                booking.getSlot()
        );

        Booking savedBooking =
                bookingRepository.save(booking);

        return BookingResponse.fromEntity(
                savedBooking
        );
    }

    @Override
    @Transactional
    public int cancelExpiredPendingPayments() {
        return expirePendingBookingsInternal(
                LocalDateTime.now()
        );
    }

    @Override
    @Transactional
    public void deleteBooking(
            Integer bookingId
    ) {
        Booking booking = findBookingOrThrow(bookingId);
        bookingRepository.delete(booking);
    }

    private int expirePendingBookingsInternal(
            LocalDateTime now
    ) {
        List<Booking> expiredBookings =
                bookingRepository
                        .findExpiredPendingPaymentBookingsForUpdate(
                                now
                        );

        if (expiredBookings.isEmpty()) {
            return 0;
        }

        for (Booking booking : expiredBookings) {
            expireBookingAsPaymentTimeout(
                    booking,
                    now
            );
        }

        bookingRepository.saveAll(expiredBookings);

        return expiredBookings.size();
    }

    private void expireBookingAsPaymentTimeout(
            Booking booking,
            LocalDateTime cancelledAt
    ) {
        payOSPaymentLinkManager.cancelPaymentLinkSilently(
                booking,
                "Payment timeout after 10 minutes"
        );

        booking.setStatus(
                Booking.STATUS_CANCELLED
        );

        booking.setPaymentStatus(
                Booking.PAYMENT_STATUS_EXPIRED
        );

        booking.setCancelledAt(cancelledAt);

        /*
         * A pending-payment booking normally does not change the physical
         * slot status. This extra release protects old inconsistent data.
         */
        releaseReservedSlotIfNeeded(
                booking.getSlot()
        );
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication
                instanceof AnonymousAuthenticationToken) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        String email = authentication.getName();

        if (email == null || email.isBlank()) {
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

    private Booking findBookingOwnedByUserOrThrow(
            Integer bookingId,
            Integer userId
    ) {
        if (bookingId == null || userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Booking ID and user ID are required"
            );
        }

        Booking booking = bookingRepository
                .findById(bookingId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );

        if (booking.getUser() == null
                || booking.getUser().getId() == null
                || !booking.getUser()
                .getId()
                .equals(userId)) {

            /*
             * Return 404 instead of 403 so another user's
             * booking ID is not disclosed.
             */
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Booking not found"
            );
        }

        return booking;
    }

    private Booking findBookingOrThrow(
            Integer bookingId
    ) {
        if (bookingId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Booking ID is required"
            );
        }

        return bookingRepository
                .findById(bookingId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );
    }

    private void validateCreateBookingRequest(
            CreateBookingRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Booking request is required"
            );
        }

        if (request.getSlotId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Slot ID is required"
            );
        }

        if (request.getVehicleTypeId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vehicle type ID is required"
            );
        }

        if (request.getStartTime() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Start time is required"
            );
        }

        if (request.getEndTime() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time is required"
            );
        }

        if (request.getStartTime()
                .isBefore(LocalDateTime.now())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Start time must be in the future"
            );
        }

        if (!request.getEndTime()
                .isAfter(request.getStartTime())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End time must be after start time"
            );
        }

        if (request.getLicensePlate() == null
                || request.getLicensePlate()
                .trim()
                .isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "License plate is required"
            );
        }
    }

    private void validateSlotForBooking(
            ParkingSlot slot,
            VehicleType vehicleType,
            CreateBookingRequest request
    ) {
        if (slot.getVehicleType() == null
                || !slot.getVehicleType()
                .getId()
                .equals(vehicleType.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot does not support this vehicle type"
            );
        }

        validatePhysicalSlotStatus(slot);

        List<Booking> overlappingBookings =
                bookingRepository
                        .findOverlappingBookings(
                                slot.getId(),
                                request.getStartTime(),
                                request.getEndTime()
                        );

        if (!overlappingBookings.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot is already reserved in this time range"
            );
        }
    }

    private void validatePhysicalSlotStatus(
            ParkingSlot slot
    ) {
        String slotStatus =
                normalizeSlotStatus(
                        slot.getStatus()
                );

        if (SLOT_STATUS_OCCUPIED.equals(slotStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot is currently occupied"
            );
        }

        if (SLOT_STATUS_MAINTENANCE.equals(slotStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot is under maintenance"
            );
        }

        if (!SLOT_STATUS_AVAILABLE.equals(slotStatus)
                && !SLOT_STATUS_RESERVED.equals(slotStatus)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected slot is not available for booking"
            );
        }
    }

    private void synchronizeConfirmedBookingState(
            Booking booking
    ) {
        boolean changed = false;

        String currentStatus = normalizeStatus(
                booking.getStatus()
        );

        String currentPaymentStatus =
                normalizePaymentStatus(
                        booking.getPaymentStatus()
                );

        if (Booking.PAYMENT_STATUS_PAID.equals(
                currentPaymentStatus
        )
                && Booking.STATUS_PENDING_PAYMENT.equals(
                currentStatus
        )) {

            booking.setStatus(
                    Booking.STATUS_CONFIRMED
            );
            changed = true;
        }

        if (Booking.STATUS_CONFIRMED.equals(
                normalizeStatus(booking.getStatus())
        )
                && !Booking.PAYMENT_STATUS_PAID.equals(
                currentPaymentStatus
        )) {

            booking.setPaymentStatus(
                    Booking.PAYMENT_STATUS_PAID
            );
            changed = true;
        }

        if (booking.getPaidAt() == null) {
            booking.setPaidAt(
                    LocalDateTime.now()
            );
            changed = true;
        }

        if (changed) {
            bookingRepository.save(booking);
        }

        if (Booking.STATUS_CONFIRMED.equals(
                normalizeStatus(booking.getStatus())
        )) {
            reserveSlotAfterPayment(
                    booking.getSlot()
            );
        }
    }

    private void reserveSlotAfterPayment(
            ParkingSlot slot
    ) {
        if (slot == null) {
            return;
        }

        String slotStatus =
                normalizeSlotStatus(
                        slot.getStatus()
                );

        if (SLOT_STATUS_MAINTENANCE.equals(slotStatus)
                || SLOT_STATUS_OCCUPIED.equals(slotStatus)) {
            return;
        }

        if (!SLOT_STATUS_RESERVED.equals(slotStatus)) {
            slot.setStatus(
                    SLOT_STATUS_RESERVED
            );
            parkingSlotRepository.save(slot);
        }
    }

    private void releaseReservedSlotIfNeeded(
            ParkingSlot slot
    ) {
        if (slot == null) {
            return;
        }

        String slotStatus =
                normalizeSlotStatus(
                        slot.getStatus()
                );

        if (SLOT_STATUS_RESERVED.equals(slotStatus)) {
            slot.setStatus(
                    SLOT_STATUS_AVAILABLE
            );
            parkingSlotRepository.save(slot);
        }
    }

    private String normalizeLicensePlate(
            String licensePlate
    ) {
        String normalizedPlate =
                licensePlate == null
                        ? ""
                        : licensePlate
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (normalizedPlate.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "License plate cannot be empty"
            );
        }

        return normalizedPlate;
    }

    private String normalizeNullableText(
            String value
    ) {
        if (value == null) {
            return null;
        }

        String normalizedValue = value.trim();

        return normalizedValue.isEmpty()
                ? null
                : normalizedValue;
    }

    private String normalizeStatus(
            String status
    ) {
        if (status == null || status.trim().isEmpty()) {
            return Booking.STATUS_PENDING_PAYMENT;
        }

        String normalizedStatus =
                status.trim().toUpperCase(Locale.ROOT);

        if ("PENDING".equals(normalizedStatus)) {
            return Booking.STATUS_PENDING_PAYMENT;
        }

        if ("CANCELED".equals(normalizedStatus)) {
            return Booking.STATUS_CANCELLED;
        }

        return normalizedStatus;
    }

    private String normalizePaymentStatus(
            String paymentStatus
    ) {
        if (paymentStatus == null
                || paymentStatus.trim().isEmpty()) {

            return Booking.PAYMENT_STATUS_PENDING;
        }

        return paymentStatus
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeSlotStatus(
            String slotStatus
    ) {
        if (slotStatus == null
                || slotStatus.trim().isEmpty()) {

            return SLOT_STATUS_AVAILABLE;
        }

        return slotStatus
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}
