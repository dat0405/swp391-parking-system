package com.tatdat.parking.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_slots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({
            "parkingSlots",
            "slots",
            "hibernateLazyInitializer",
            "handler"
    })
    private ParkingZone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    @JsonIgnoreProperties({
            "parkingSlots",
            "slots",
            "hibernateLazyInitializer",
            "handler"
    })
    private VehicleType vehicleType;

    @Column(name = "slot_code", nullable = false, length = 50)
    private String slotCode;

    @Column(name = "status", length = 20)
    private String status;

    @PrePersist
    public void onCreate() {
        applyDefaultValues();
    }

    @PreUpdate
    public void onUpdate() {
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (status == null || status.isBlank()) {
            status = "AVAILABLE";
        }

        status = status.trim().toUpperCase();

        if (slotCode != null) {
            slotCode = slotCode.trim().toUpperCase();
        }
    }
}