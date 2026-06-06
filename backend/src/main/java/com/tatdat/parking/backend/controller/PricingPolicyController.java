package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.PricingPolicy;
import com.tatdat.parking.backend.repository.PricingPolicyRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pricing-policies")
public class PricingPolicyController {

    private final PricingPolicyRepository pricingPolicyRepository;

    public PricingPolicyController(PricingPolicyRepository pricingPolicyRepository) {
        this.pricingPolicyRepository = pricingPolicyRepository;
    }

    @GetMapping
    public List<PricingPolicy> getAllPricingPolicies() {
        return pricingPolicyRepository.findAll();
    }

    @GetMapping("/{id}")
    public PricingPolicy getPricingPolicyById(@PathVariable Integer id) {
        return pricingPolicyRepository.findById(id).orElse(null);
    }

    @PostMapping
    public PricingPolicy createPricingPolicy(@RequestBody PricingPolicy pricingPolicy) {
        return pricingPolicyRepository.save(pricingPolicy);
    }

    @PutMapping("/{id}")
    public PricingPolicy updatePricingPolicy(
            @PathVariable Integer id,
            @RequestBody PricingPolicy updatedPricingPolicy
    ) {
        PricingPolicy pricingPolicy =
                pricingPolicyRepository.findById(id).orElse(null);

        if (pricingPolicy != null) {
            pricingPolicy.setBasePrice(updatedPricingPolicy.getBasePrice());
            pricingPolicy.setPricePerHour(updatedPricingPolicy.getPricePerHour());
            pricingPolicy.setOvertimeFee(updatedPricingPolicy.getOvertimeFee());

            return pricingPolicyRepository.save(pricingPolicy);
        }

        return null;
    }

    @DeleteMapping("/{id}")
    public String deletePricingPolicy(@PathVariable Integer id) {
        pricingPolicyRepository.deleteById(id);
        return "Deleted Successfully";
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