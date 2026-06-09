package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.entity.ParkingSession;
import com.tatdat.parking.backend.entity.PricingPolicy;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface FeeCalculatorService {
    BigDecimal calculate(ParkingSession session, PricingPolicy policy, LocalDateTime checkOutTime);
}