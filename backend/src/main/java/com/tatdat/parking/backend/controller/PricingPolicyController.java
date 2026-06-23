package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.PricingPolicyRequest;
import com.tatdat.parking.backend.dto.PricingPolicyResponse;
import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/pricing-policies")
@RequiredArgsConstructor
public class PricingPolicyController {

    private final PricingPolicyRepository pricingPolicyRepository;
    private final VehicleTypeRepository vehicleTypeRepository;

    @GetMapping
    public List<PricingPolicyResponse> getAllPricingPolicies() {
        return pricingPolicyRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public PricingPolicyResponse getPricingPolicyById(@PathVariable Integer id) {
        PricingPolicy pricingPolicy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        return mapToResponse(pricingPolicy);
    }

    @PostMapping
    public PricingPolicyResponse createPricingPolicy(@RequestBody PricingPolicyRequest request) {
        validatePricingPolicyRequest(request);

        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("Vehicle type not found"));

        String status = normalizeStatus(request.getStatus());

        if ("ACTIVE".equals(status)
                && pricingPolicyRepository.existsByVehicleType_IdAndStatus(
                request.getVehicleTypeId(),
                "ACTIVE"
        )) {
            throw new RuntimeException("This vehicle type already has an active pricing policy");
        }

        PricingPolicy pricingPolicy = PricingPolicy.builder()
                .vehicleType(vehicleType)
                .basePrice(request.getBasePrice())
                .pricePerHour(request.getPricePerHour())
                .overtimeFee(
                        request.getOvertimeFee() == null
                                ? BigDecimal.ZERO
                                : request.getOvertimeFee()
                )
                .status(status)
                .build();

        PricingPolicy savedPricingPolicy = pricingPolicyRepository.save(pricingPolicy);

        return mapToResponse(savedPricingPolicy);
    }

    @PutMapping("/{id}")
    public PricingPolicyResponse updatePricingPolicy(
            @PathVariable Integer id,
            @RequestBody PricingPolicyRequest request
    ) {
        validatePricingPolicyRequest(request);

        PricingPolicy pricingPolicy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        if (pricingPolicy != null) {
            pricingPolicy.setBasePrice(updatedPricingPolicy.getBasePrice());
            pricingPolicy.setPricePerHour(updatedPricingPolicy.getPricePerHour());
            pricingPolicy.setOvertimeFee(updatedPricingPolicy.getOvertimeFee());
        VehicleType vehicleType = vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("Vehicle type not found"));

        String status = normalizeStatus(request.getStatus());

        if ("ACTIVE".equals(status)) {
            pricingPolicyRepository
                    .findFirstByVehicleType_IdAndStatus(request.getVehicleTypeId(), "ACTIVE")
                    .ifPresent(existingPolicy -> {
                        if (!existingPolicy.getId().equals(id)) {
                            throw new RuntimeException("This vehicle type already has another active pricing policy");
                        }
                    });
        }

        pricingPolicy.setVehicleType(vehicleType);
        pricingPolicy.setBasePrice(request.getBasePrice());
        pricingPolicy.setPricePerHour(request.getPricePerHour());
        pricingPolicy.setOvertimeFee(
                request.getOvertimeFee() == null
                        ? BigDecimal.ZERO
                        : request.getOvertimeFee()
        );
        pricingPolicy.setStatus(status);

        PricingPolicy savedPricingPolicy = pricingPolicyRepository.save(pricingPolicy);

        return mapToResponse(savedPricingPolicy);
    }

    @PutMapping("/{id}/status")
    public PricingPolicyResponse updatePricingPolicyStatus(
            @PathVariable Integer id,
            @RequestBody PricingPolicyRequest request
    ) {
        PricingPolicy pricingPolicy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        String status = normalizeStatus(request.getStatus());

        if ("ACTIVE".equals(status)) {
            Integer vehicleTypeId = pricingPolicy.getVehicleType().getId();

            pricingPolicyRepository
                    .findFirstByVehicleType_IdAndStatus(vehicleTypeId, "ACTIVE")
                    .ifPresent(existingPolicy -> {
                        if (!existingPolicy.getId().equals(id)) {
                            throw new RuntimeException("This vehicle type already has another active pricing policy");
                        }
                    });
        }

        pricingPolicy.setStatus(status);

        PricingPolicy savedPricingPolicy = pricingPolicyRepository.save(pricingPolicy);

        return mapToResponse(savedPricingPolicy);
    }

    @DeleteMapping("/{id}")
    public String deletePricingPolicy(@PathVariable Integer id) {
        PricingPolicy pricingPolicy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pricing policy not found"));

        pricingPolicy.setStatus("INACTIVE");
        pricingPolicyRepository.save(pricingPolicy);

        return "Pricing policy has been disabled successfully";
    }

    @GetMapping("/vehicle-type/{vehicleTypeId}")
    public List<PricingPolicyResponse> getPricingPolicyByVehicleType(
            @PathVariable Integer vehicleTypeId
    ) {
        return pricingPolicyRepository.findByVehicleType_Id(vehicleTypeId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @PutMapping("/vehicle-type/{vehicleTypeId}")
    public List<PricingPolicyResponse> updatePricingByVehicleType(
            @PathVariable Integer vehicleTypeId,
            @RequestBody PricingPolicyRequest request
    ) {
        if (request.getBasePrice() == null) {
            throw new RuntimeException("Base price is required");
        }

        if (request.getPricePerHour() == null) {
            throw new RuntimeException("Price per hour is required");
        }

        if (request.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Base price cannot be negative");
        }

        if (request.getPricePerHour().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Price per hour cannot be negative");
        }

        if (request.getOvertimeFee() != null
                && request.getOvertimeFee().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Overtime fee cannot be negative");
        }

        List<PricingPolicy> pricingPolicies =
                pricingPolicyRepository.findByVehicleType_Id(vehicleTypeId);

        if (pricingPolicies.isEmpty()) {
            throw new RuntimeException("Pricing policy not found for this vehicle type");
        }

        for (PricingPolicy pricingPolicy : pricingPolicies) {
            pricingPolicy.setBasePrice(request.getBasePrice());
            pricingPolicy.setPricePerHour(request.getPricePerHour());
            pricingPolicy.setOvertimeFee(
                    request.getOvertimeFee() == null
                            ? BigDecimal.ZERO
                            : request.getOvertimeFee()
            );

            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                pricingPolicy.setStatus(normalizeStatus(request.getStatus()));
            }
        }

        return pricingPolicyRepository.saveAll(pricingPolicies)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void validatePricingPolicyRequest(PricingPolicyRequest request) {
        if (request.getVehicleTypeId() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        if (request.getBasePrice() == null) {
            throw new RuntimeException("Base price is required");
        }

        if (request.getPricePerHour() == null) {
            throw new RuntimeException("Price per hour is required");
        }

        if (request.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Base price cannot be negative");
        }

        if (request.getPricePerHour().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Price per hour cannot be negative");
        }

        if (request.getOvertimeFee() != null
                && request.getOvertimeFee().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Overtime fee cannot be negative");
        }
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ACTIVE";
        }

        String normalizedStatus = status.trim().toUpperCase();

        if (!"ACTIVE".equals(normalizedStatus)
                && !"INACTIVE".equals(normalizedStatus)) {
            throw new RuntimeException("Invalid pricing policy status");
        }

        return normalizedStatus;
    }

    private PricingPolicyResponse mapToResponse(PricingPolicy pricingPolicy) {
        return PricingPolicyResponse.builder()
                .id(pricingPolicy.getId())
                .vehicleTypeId(pricingPolicy.getVehicleType().getId())
                .vehicleTypeName(pricingPolicy.getVehicleType().getTypeName())
                .basePrice(pricingPolicy.getBasePrice())
                .pricePerHour(pricingPolicy.getPricePerHour())
                .overtimeFee(pricingPolicy.getOvertimeFee())
                .status(pricingPolicy.getStatus())
                .createdAt(pricingPolicy.getCreatedAt())
                .updatedAt(pricingPolicy.getUpdatedAt())
                .build();
    }

    @GetMapping("/vehicle-type/{vehicleTypeId}")
    public List<PricingPolicy> getPricingPolicyByVehicleType(
            @PathVariable Integer vehicleTypeId
    ) {
        return pricingPolicyRepository.findByVehicleType_Id(vehicleTypeId);
    }

    @PutMapping("/vehicle-type/{vehicleTypeId}")
    public List<PricingPolicy> updatePricingByVehicleType(
            @PathVariable Integer vehicleTypeId,
            @RequestBody PricingPolicy updatedPricingPolicy
    ) {
        List<PricingPolicy> pricingPolicies =
                pricingPolicyRepository.findByVehicleType_Id(vehicleTypeId);

        for (PricingPolicy pricingPolicy : pricingPolicies) {
            pricingPolicy.setBasePrice(updatedPricingPolicy.getBasePrice());
            pricingPolicy.setPricePerHour(updatedPricingPolicy.getPricePerHour());
            pricingPolicy.setOvertimeFee(updatedPricingPolicy.getOvertimeFee());
        }

        return pricingPolicyRepository.saveAll(pricingPolicies);
    }
}