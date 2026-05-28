package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleTypeRepository extends JpaRepository<VehicleType, Integer> {
}