package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "holidays")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "holiday_name", nullable = false, length = 100)
    private String holidayName;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(name = "surcharge_type", nullable = false, length = 20)
    private String surchargeType;

    @Column(name = "surcharge_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal surchargeValue;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}