package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "price_per_hour")
    private BigDecimal pricePerHour;

    @Column(name = "overtime_fee")
    private BigDecimal overtimeFee;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;
}