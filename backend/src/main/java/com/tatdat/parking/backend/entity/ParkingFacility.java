package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_facilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParkingFacility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "facility_name", nullable = false, length = 100)
    private String facilityName;

    @Column(length = 255)
    private String address;

    @Column(length = 20)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}