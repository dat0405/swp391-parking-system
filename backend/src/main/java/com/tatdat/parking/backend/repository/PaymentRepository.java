package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;

public interface PaymentRepository
        extends JpaRepository<Payment, Integer> {

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.paymentStatus = 'PAID'
            """)
    BigDecimal getTotalRevenue();

    long countByPaymentStatus(String paymentStatus);
}