package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.PricingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PricingPolicyRepository extends JpaRepository<PricingPolicy, Integer> {

    List<PricingPolicy> findByVehicleType_Id(Integer vehicleTypeId);

    List<PricingPolicy> findByStatusIgnoreCase(String status);

    List<PricingPolicy> findAllByOrderByIdDesc();

    Optional<PricingPolicy> findFirstByVehicleType_IdAndStatusIgnoreCase(
            Integer vehicleTypeId,
            String status
    );

    Optional<PricingPolicy> findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByUpdatedAtDesc(
            Integer vehicleTypeId,
            String status
    );

    Optional<PricingPolicy> findFirstByVehicleType_IdAndStatusIgnoreCaseOrderByIdDesc(
            Integer vehicleTypeId,
            String status
    );

    boolean existsByVehicleType_IdAndStatusIgnoreCase(
            Integer vehicleTypeId,
            String status
    );
}