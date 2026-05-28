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
            pricingPolicy.setVehicleType(updatedPricingPolicy.getVehicleType());
            pricingPolicy.setBasePrice(updatedPricingPolicy.getBasePrice());

            return pricingPolicyRepository.save(pricingPolicy);
        }

        return null;
    }

    @DeleteMapping("/{id}")
    public String deletePricingPolicy(@PathVariable Integer id) {
        pricingPolicyRepository.deleteById(id);
        return "Deleted Successfully";
    }
}