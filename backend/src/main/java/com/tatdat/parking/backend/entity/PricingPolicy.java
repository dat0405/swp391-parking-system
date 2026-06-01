package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "pricing_policies")

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class PricingPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;

    @Column(name = "price_per_hour", nullable = false)
    private BigDecimal pricePerHour;

    @Column(name = "overtime_fee")
    private BigDecimal overtimeFee;
}