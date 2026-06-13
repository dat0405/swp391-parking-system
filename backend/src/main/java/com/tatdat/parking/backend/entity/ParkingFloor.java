package com.tatdat.parking.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_floors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingFloor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    @JsonIgnoreProperties({
            "parkingFloors",
            "floors",
            "hibernateLazyInitializer",
            "handler"
    })
    private ParkingFacility facility;

    @Column(name = "floor_name", nullable = false, length = 50)
    private String floorName;

    @PrePersist
    public void onCreate() {
        applyDefaultValues();
    }

    @PreUpdate
    public void onUpdate() {
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (floorName != null) {
            floorName = floorName.trim();
        }
    }
}