package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.BookingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingHistoryRepository extends JpaRepository<BookingHistory, Integer> {
}