package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingException;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingExceptionRepository extends JpaRepository<ParkingException, Integer> {
}