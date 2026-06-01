package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.PricingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PricingPolicyRepository extends JpaRepository<PricingPolicy, Integer> {

    List<PricingPolicy> findByVehicleTypeId(Integer vehicleTypeId);
}