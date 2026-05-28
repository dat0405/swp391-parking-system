package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParkingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "floor_id", nullable = false)
    private ParkingFloor floor;

    @Column(name = "zone_name", nullable = false, length = 50)
    private String zoneName;
}