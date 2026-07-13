package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Integer> {

    Optional<Holiday> findByHolidayDateAndIsActiveTrue(LocalDate holidayDate);

    @Query("SELECT h FROM Holiday h WHERE h.isActive = true")
    List<Holiday> findActiveHolidays();
}