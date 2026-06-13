package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "license_plate", length = 30)
    private String licensePlate;

    @Column(length = 50)
    private String color;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(length = 255)
    private String reason;

    @PrePersist
    public void prePersist() {
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }

        if (licensePlate != null) {
            licensePlate = licensePlate.trim().toUpperCase();
        }

        if (color != null) {
            color = color.trim();
        }

        if (reason != null) {
            reason = reason.trim();
        }

        if (updatedBy != null) {
            updatedBy = updatedBy.trim();
        }
    }
}