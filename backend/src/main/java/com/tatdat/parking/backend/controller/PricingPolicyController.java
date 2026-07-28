package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.PricingPolicyRequest;
import com.tatdat.parking.backend.dto.PricingPolicyResponse;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import com.tatdat.parking.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/pricing-policies")
@RequiredArgsConstructor
public class PricingPolicyController {

    /**
     * Loại notification gửi đến toàn bộ tài khoản
     * khi giá đỗ xe mặc định hoặc phí quá giờ thay đổi.
     */
    private static final String NOTIFICATION_PARKING_FEE_UPDATED =
            "PARKING_FEE_UPDATED";

    private final PricingPolicyRepository pricingPolicyRepository;

    private final VehicleTypeRepository vehicleTypeRepository;

    private final NotificationService notificationService;

    /**
     * Lấy toàn bộ chính sách giá.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<PricingPolicyResponse>
    getAllPricingPolicies() {
        return pricingPolicyRepository
                .findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Lấy chính sách giá theo ID.
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public PricingPolicyResponse getPricingPolicyById(
            @PathVariable Integer id
    ) {
        PricingPolicy pricingPolicy =
                findPricingPolicyOrThrow(id);

        return mapToResponse(pricingPolicy);
    }

    /**
     * Lấy chính sách giá ACTIVE mới nhất
     * theo loại phương tiện.
     */
    @GetMapping("/active/vehicle-type/{vehicleTypeId}")
    @Transactional(readOnly = true)
    public PricingPolicyResponse
    getActivePricingPolicyByVehicleType(
            @PathVariable Integer vehicleTypeId
    ) {
        PricingPolicy pricingPolicy =
                pricingPolicyRepository
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
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active pricing policy not found for this vehicle type"
                                )
                        );

        return mapToResponse(pricingPolicy);
    }

    /**
     * Tạo chính sách giá mới.
     *
     * Nếu chính sách được tạo ở trạng thái ACTIVE,
     * toàn bộ tài khoản đang hoạt động sẽ nhận thông báo
     * về giá đỗ xe mặc định và phí quá giờ.
     */
    @PostMapping
    @Transactional
    public PricingPolicyResponse createPricingPolicy(
            @RequestBody PricingPolicyRequest request
    ) {
        validatePricingPolicyRequest(request);

        VehicleType vehicleType =
                findVehicleTypeOrThrow(
                        request.getVehicleTypeId()
                );

        String status =
                normalizeStatus(
                        request.getStatus()
                );

        ensureNoOtherActivePolicy(
                request.getVehicleTypeId(),
                null,
                status
        );

        PricingPolicy pricingPolicy =
                PricingPolicy.builder()
                        .vehicleType(vehicleType)
                        .basePrice(
                                safeMoney(
                                        request.getBasePrice()
                                )
                        )
                        .pricePerHour(
                                safeMoney(
                                        request.getPricePerHour()
                                )
                        )
                        .overtimeFee(
                                safeMoney(
                                        request.getOvertimeFee()
                                )
                        )
                        .overstayFee(
                                safeMoney(
                                        request.getOverstayFee()
                                )
                        )
                        .status(status)
                        .build();

        PricingPolicy savedPricingPolicy =
                pricingPolicyRepository.save(
                        pricingPolicy
                );

        /*
         * Chính sách ACTIVE mới trở thành mức giá
         * đang được áp dụng nên cần thông báo toàn hệ thống.
         */
        if (isActive(savedPricingPolicy)) {
            broadcastEffectivePricingChange(
                    savedPricingPolicy,
                    null,
                    null,
                    true
            );
        }

        return mapToResponse(
                savedPricingPolicy
        );
    }

    /**
     * Cập nhật một chính sách giá.
     *
     * Chỉ gửi notification nếu chính sách sau cập nhật
     * đang ACTIVE và có thay đổi:
     *
     * - pricePerHour: giá đỗ mặc định;
     * - overstayFee: phí quá giờ.
     */
    @PutMapping("/{id}")
    @Transactional
    public PricingPolicyResponse updatePricingPolicy(
            @PathVariable Integer id,
            @RequestBody PricingPolicyRequest request
    ) {
        validatePricingPolicyRequest(request);

        PricingPolicy pricingPolicy =
                findPricingPolicyOrThrow(id);

        VehicleType newVehicleType =
                findVehicleTypeOrThrow(
                        request.getVehicleTypeId()
                );

        String newStatus =
                normalizeStatus(
                        request.getStatus()
                );

        ensureNoOtherActivePolicy(
                request.getVehicleTypeId(),
                id,
                newStatus
        );

        /*
         * Lưu dữ liệu cũ trước khi cập nhật
         * để xác định chính xác mức giá nào đã thay đổi.
         */
        BigDecimal oldPricePerHour =
                safeMoney(
                        pricingPolicy.getPricePerHour()
                );

        BigDecimal oldOverstayFee =
                safeMoney(
                        pricingPolicy.getOverstayFee()
                );

        boolean wasActive =
                isActive(pricingPolicy);

        Integer oldVehicleTypeId =
                pricingPolicy.getVehicleType() == null
                        ? null
                        : pricingPolicy
                        .getVehicleType()
                        .getId();

        pricingPolicy.setVehicleType(
                newVehicleType
        );

        pricingPolicy.setBasePrice(
                safeMoney(
                        request.getBasePrice()
                )
        );

        pricingPolicy.setPricePerHour(
                safeMoney(
                        request.getPricePerHour()
                )
        );

        /*
         * overtimeFee hiện đang được dùng
         * làm phí qua đêm theo số ngày lịch.
         */
        pricingPolicy.setOvertimeFee(
                safeMoney(
                        request.getOvertimeFee()
                )
        );

        /*
         * overstayFee chính là phí quá thời gian booking.
         */
        pricingPolicy.setOverstayFee(
                safeMoney(
                        request.getOverstayFee()
                )
        );

        pricingPolicy.setStatus(
                newStatus
        );

        PricingPolicy savedPricingPolicy =
                pricingPolicyRepository.save(
                        pricingPolicy
                );

        boolean vehicleTypeChanged =
                oldVehicleTypeId == null
                        || !oldVehicleTypeId.equals(
                        newVehicleType.getId()
                );

        boolean becameActive =
                !wasActive
                        && isActive(
                        savedPricingPolicy
                );

        /*
         * Khi chính sách ACTIVE:
         *
         * - Giá mặc định thay đổi;
         * - Phí quá giờ thay đổi;
         * - Chính sách vừa được kích hoạt;
         * - Hoặc chính sách ACTIVE chuyển sang loại xe khác;
         *
         * thì gửi một notification chung cho toàn hệ thống.
         */
        if (isActive(savedPricingPolicy)) {
            broadcastEffectivePricingChange(
                    savedPricingPolicy,
                    oldPricePerHour,
                    oldOverstayFee,
                    becameActive
                            || vehicleTypeChanged
            );
        }

        return mapToResponse(
                savedPricingPolicy
        );
    }

    /**
     * Chỉ cập nhật trạng thái của chính sách.
     *
     * Khi một chính sách chuyển từ INACTIVE sang ACTIVE,
     * gửi thông báo mức giá đang bắt đầu được áp dụng.
     */
    @PutMapping("/{id}/status")
    @Transactional
    public PricingPolicyResponse updatePricingPolicyStatus(
            @PathVariable Integer id,
            @RequestBody PricingPolicyRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Pricing policy request is required"
            );
        }

        PricingPolicy pricingPolicy =
                findPricingPolicyOrThrow(id);

        String oldStatus =
                normalizeStoredStatus(
                        pricingPolicy.getStatus()
                );

        String newStatus =
                normalizeStatus(
                        request.getStatus()
                );

        Integer vehicleTypeId =
                pricingPolicy
                        .getVehicleType()
                        .getId();

        ensureNoOtherActivePolicy(
                vehicleTypeId,
                id,
                newStatus
        );

        pricingPolicy.setStatus(
                newStatus
        );

        PricingPolicy savedPricingPolicy =
                pricingPolicyRepository.save(
                        pricingPolicy
                );

        boolean becameActive =
                !PricingPolicy.STATUS_ACTIVE.equals(
                        oldStatus
                )
                        && PricingPolicy.STATUS_ACTIVE.equals(
                        newStatus
                );

        if (becameActive) {
            broadcastEffectivePricingChange(
                    savedPricingPolicy,
                    savedPricingPolicy.getPricePerHour(),
                    savedPricingPolicy.getOverstayFee(),
                    true
            );
        }

        return mapToResponse(
                savedPricingPolicy
        );
    }

    /**
     * Soft delete:
     * chuyển chính sách về INACTIVE.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public String deletePricingPolicy(
            @PathVariable Integer id
    ) {
        PricingPolicy pricingPolicy =
                findPricingPolicyOrThrow(id);

        pricingPolicy.setStatus(
                PricingPolicy.STATUS_INACTIVE
        );

        pricingPolicyRepository.save(
                pricingPolicy
        );

        return "Pricing policy has been disabled successfully";
    }

    /**
     * Lấy toàn bộ chính sách theo loại phương tiện.
     */
    @GetMapping("/vehicle-type/{vehicleTypeId}")
    @Transactional(readOnly = true)
    public List<PricingPolicyResponse>
    getPricingPolicyByVehicleType(
            @PathVariable Integer vehicleTypeId
    ) {
        return pricingPolicyRepository
                .findByVehicleType_Id(
                        vehicleTypeId
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Cập nhật giá hàng loạt theo loại phương tiện.
     *
     * Chỉ tạo một notification dù nhiều record được cập nhật.
     */
    @PutMapping("/vehicle-type/{vehicleTypeId}")
    @Transactional
    public List<PricingPolicyResponse>
    updatePricingByVehicleType(
            @PathVariable Integer vehicleTypeId,
            @RequestBody PricingPolicyRequest request
    ) {
        validatePricingPolicyAmounts(request);

        List<PricingPolicy> pricingPolicies =
                pricingPolicyRepository
                        .findByVehicleType_Id(
                                vehicleTypeId
                        );

        if (
                pricingPolicies == null
                        || pricingPolicies.isEmpty()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Pricing policy not found for this vehicle type"
            );
        }

        String requestedStatus = null;

        if (
                request.getStatus() != null
                        && !request
                        .getStatus()
                        .isBlank()
        ) {
            requestedStatus =
                    normalizeStatus(
                            request.getStatus()
                    );
        }

        /*
         * Không cho phép bulk update biến nhiều policy
         * cùng lúc thành ACTIVE.
         */
        if (
                PricingPolicy.STATUS_ACTIVE.equals(
                        requestedStatus
                )
                        && pricingPolicies.size() > 1
        ) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bulk update cannot activate multiple pricing policies for the same vehicle type"
            );
        }

        PricingPolicy activePolicyBefore =
                pricingPolicies
                        .stream()
                        .filter(this::isActive)
                        .findFirst()
                        .orElse(null);

        BigDecimal oldPricePerHour =
                activePolicyBefore == null
                        ? null
                        : safeMoney(
                        activePolicyBefore
                                .getPricePerHour()
                );

        BigDecimal oldOverstayFee =
                activePolicyBefore == null
                        ? null
                        : safeMoney(
                        activePolicyBefore
                                .getOverstayFee()
                );

        for (
                PricingPolicy pricingPolicy
                : pricingPolicies
        ) {
            pricingPolicy.setBasePrice(
                    safeMoney(
                            request.getBasePrice()
                    )
            );

            pricingPolicy.setPricePerHour(
                    safeMoney(
                            request.getPricePerHour()
                    )
            );

            pricingPolicy.setOvertimeFee(
                    safeMoney(
                            request.getOvertimeFee()
                    )
            );

            pricingPolicy.setOverstayFee(
                    safeMoney(
                            request.getOverstayFee()
                    )
            );

            if (requestedStatus != null) {
                pricingPolicy.setStatus(
                        requestedStatus
                );
            }
        }

        List<PricingPolicy> savedPolicies =
                pricingPolicyRepository.saveAll(
                        pricingPolicies
                );

        PricingPolicy activePolicyAfter =
                savedPolicies
                        .stream()
                        .filter(this::isActive)
                        .findFirst()
                        .orElse(null);

        /*
         * Chỉ thông báo mức giá đang được áp dụng.
         * Các policy INACTIVE không ảnh hưởng giá hiện tại.
         */
        if (activePolicyAfter != null) {
            broadcastEffectivePricingChange(
                    activePolicyAfter,
                    oldPricePerHour,
                    oldOverstayFee,
                    activePolicyBefore == null
            );
        }

        return savedPolicies
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Bảo đảm một loại xe chỉ có một
     * chính sách ACTIVE.
     */
    private void ensureNoOtherActivePolicy(
            Integer vehicleTypeId,
            Integer currentPolicyId,
            String requestedStatus
    ) {
        if (
                !PricingPolicy.STATUS_ACTIVE.equals(
                        requestedStatus
                )
        ) {
            return;
        }

        pricingPolicyRepository
                .findFirstByVehicleType_IdAndStatusIgnoreCase(
                        vehicleTypeId,
                        PricingPolicy.STATUS_ACTIVE
                )
                .ifPresent(existingPolicy -> {
                    if (
                            currentPolicyId == null
                                    || !existingPolicy
                                    .getId()
                                    .equals(
                                            currentPolicyId
                                    )
                    ) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "This vehicle type already has another active pricing policy"
                        );
                    }
                });
    }

    /**
     * Gửi thông báo toàn hệ thống khi:
     *
     * - Giá đỗ xe mặc định thay đổi;
     * - Phí quá giờ thay đổi;
     * - Hoặc chính sách vừa trở thành ACTIVE.
     *
     * NotificationService phải tạo một bản ghi riêng
     * cho từng tài khoản đang hoạt động.
     */
    private void broadcastEffectivePricingChange(
            PricingPolicy pricingPolicy,
            BigDecimal oldPricePerHour,
            BigDecimal oldOverstayFee,
            boolean forceCurrentPriceSummary
    ) {
        if (
                pricingPolicy == null
                        || !isActive(
                        pricingPolicy
                )
        ) {
            return;
        }

        BigDecimal newPricePerHour =
                safeMoney(
                        pricingPolicy.getPricePerHour()
                );

        BigDecimal newOverstayFee =
                safeMoney(
                        pricingPolicy.getOverstayFee()
                );

        boolean defaultPriceChanged =
                oldPricePerHour != null
                        && moneyChanged(
                        oldPricePerHour,
                        newPricePerHour
                );

        boolean overstayFeeChanged =
                oldOverstayFee != null
                        && moneyChanged(
                        oldOverstayFee,
                        newOverstayFee
                );

        if (
                !forceCurrentPriceSummary
                        && !defaultPriceChanged
                        && !overstayFeeChanged
        ) {
            return;
        }

        String vehicleTypeName =
                getVehicleTypeName(
                        pricingPolicy
                );

        List<String> messageParts =
                new ArrayList<>();

        if (forceCurrentPriceSummary) {
            messageParts.add(
                    "The active parking fee policy for "
                            + vehicleTypeName
                            + " has been updated."
            );

            messageParts.add(
                    "Default parking price: "
                            + formatMoney(
                            newPricePerHour
                    )
                            + " VND/hour."
            );

            messageParts.add(
                    "Overstay fee: "
                            + formatMoney(
                            newOverstayFee
                    )
                            + " VND/hour."
            );
        } else {
            messageParts.add(
                    "Parking fees for "
                            + vehicleTypeName
                            + " have been updated."
            );

            if (defaultPriceChanged) {
                messageParts.add(
                        "Default parking price changed from "
                                + formatMoney(
                                oldPricePerHour
                        )
                                + " VND/hour to "
                                + formatMoney(
                                newPricePerHour
                        )
                                + " VND/hour."
                );
            }

            if (overstayFeeChanged) {
                messageParts.add(
                        "Overstay fee changed from "
                                + formatMoney(
                                oldOverstayFee
                        )
                                + " VND/hour to "
                                + formatMoney(
                                newOverstayFee
                        )
                                + " VND/hour."
                );
            }
        }

        String message =
                String.join(
                        " ",
                        messageParts
                );

        notificationService
                .broadcastNotification(
                        "Parking fee updated",
                        message,
                        NOTIFICATION_PARKING_FEE_UPDATED
                );
    }

    private PricingPolicy findPricingPolicyOrThrow(
            Integer id
    ) {
        if (id == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Pricing policy ID is required"
            );
        }

        return pricingPolicyRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Pricing policy not found"
                        )
                );
    }

    private VehicleType findVehicleTypeOrThrow(
            Integer vehicleTypeId
    ) {
        if (vehicleTypeId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vehicle type is required"
            );
        }

        return vehicleTypeRepository
                .findById(vehicleTypeId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Vehicle type not found"
                        )
                );
    }

    private void validatePricingPolicyRequest(
            PricingPolicyRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Pricing policy request is required"
            );
        }

        if (request.getVehicleTypeId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vehicle type is required"
            );
        }

        validatePricingPolicyAmounts(
                request
        );
    }

    private void validatePricingPolicyAmounts(
            PricingPolicyRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Pricing policy request is required"
            );
        }

        if (request.getBasePrice() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Base price is required"
            );
        }

        if (request.getPricePerHour() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Price per hour is required"
            );
        }

        if (
                request.getBasePrice()
                        .compareTo(
                                BigDecimal.ZERO
                        ) < 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Base price cannot be negative"
            );
        }

        if (
                request.getPricePerHour()
                        .compareTo(
                                BigDecimal.ZERO
                        ) < 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Price per hour cannot be negative"
            );
        }

        if (
                request.getOvertimeFee() != null
                        && request
                        .getOvertimeFee()
                        .compareTo(
                                BigDecimal.ZERO
                        ) < 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Overtime fee cannot be negative"
            );
        }

        if (
                request.getOverstayFee() != null
                        && request
                        .getOverstayFee()
                        .compareTo(
                                BigDecimal.ZERO
                        ) < 0
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Overstay fee cannot be negative"
            );
        }
    }

    private BigDecimal safeMoney(
            BigDecimal value
    ) {
        if (value == null) {
            return BigDecimal.ZERO
                    .setScale(
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        return value.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private boolean moneyChanged(
            BigDecimal oldValue,
            BigDecimal newValue
    ) {
        return safeMoney(oldValue)
                .compareTo(
                        safeMoney(newValue)
                ) != 0;
    }

    private String formatMoney(
            BigDecimal value
    ) {
        BigDecimal normalizedValue =
                safeMoney(value)
                        .stripTrailingZeros();

        return normalizedValue
                .toPlainString();
    }

    private String normalizeStatus(
            String status
    ) {
        if (
                status == null
                        || status.isBlank()
        ) {
            return PricingPolicy.STATUS_ACTIVE;
        }

        String normalizedStatus =
                status
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (
                !PricingPolicy.STATUS_ACTIVE.equals(
                        normalizedStatus
                )
                        && !PricingPolicy.STATUS_INACTIVE.equals(
                        normalizedStatus
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid pricing policy status"
            );
        }

        return normalizedStatus;
    }

    private String normalizeStoredStatus(
            String status
    ) {
        if (
                status == null
                        || status.isBlank()
        ) {
            return PricingPolicy.STATUS_INACTIVE;
        }

        return status
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private boolean isActive(
            PricingPolicy pricingPolicy
    ) {
        return pricingPolicy != null
                && PricingPolicy.STATUS_ACTIVE.equals(
                normalizeStoredStatus(
                        pricingPolicy.getStatus()
                )
        );
    }

    private String getVehicleTypeName(
            PricingPolicy pricingPolicy
    ) {
        if (
                pricingPolicy == null
                        || pricingPolicy
                        .getVehicleType() == null
                        || pricingPolicy
                        .getVehicleType()
                        .getTypeName() == null
                        || pricingPolicy
                        .getVehicleType()
                        .getTypeName()
                        .isBlank()
        ) {
            return "this vehicle type";
        }

        return pricingPolicy
                .getVehicleType()
                .getTypeName()
                .trim();
    }

    private PricingPolicyResponse mapToResponse(
            PricingPolicy pricingPolicy
    ) {
        return PricingPolicyResponse
                .builder()
                .id(
                        pricingPolicy.getId()
                )
                .vehicleTypeId(
                        pricingPolicy
                                .getVehicleType()
                                .getId()
                )
                .vehicleTypeName(
                        pricingPolicy
                                .getVehicleType()
                                .getTypeName()
                )
                .basePrice(
                        pricingPolicy.getBasePrice()
                )
                .pricePerHour(
                        pricingPolicy.getPricePerHour()
                )
                .overtimeFee(
                        pricingPolicy.getOvertimeFee()
                )
                .overstayFee(
                        pricingPolicy.getOverstayFee()
                )
                .status(
                        pricingPolicy.getStatus()
                )
                .createdAt(
                        pricingPolicy.getCreatedAt()
                )
                .updatedAt(
                        pricingPolicy.getUpdatedAt()
                )
                .build();
    }
}