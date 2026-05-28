package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_floors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParkingFloor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "facility_id", nullable = false)
    private ParkingFacility facility;

    @Column(name = "floor_name", nullable = false, length = 50)
    private String floorName;
}