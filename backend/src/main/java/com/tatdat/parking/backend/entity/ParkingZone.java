package com.tatdat.parking.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_zones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id", nullable = false)
    @JsonIgnoreProperties({
            "zones",
            "parkingZones",
            "parkingSlots",
            "slots",
            "hibernateLazyInitializer",
            "handler"
    })
    private ParkingFloor floor;

    @Column(name = "zone_name", nullable = false, length = 50)
    private String zoneName;

    @PrePersist
    public void onCreate() {
        applyDefaultValues();
    }

    @PreUpdate
    public void onUpdate() {
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (zoneName != null) {
            zoneName = zoneName.trim();
        }
    }
}