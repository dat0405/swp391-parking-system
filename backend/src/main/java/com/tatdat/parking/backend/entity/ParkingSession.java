package com.tatdat.parking.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ticket_id", length = 20, unique = true)
    private String ticketId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    @JsonIgnoreProperties({
            "user",
            "vehicleType",
            "hibernateLazyInitializer",
            "handler"
    })
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    @JsonIgnoreProperties({
            "zone",
            "vehicleType",
            "hibernateLazyInitializer",
            "handler"
    })
    private ParkingSlot slot;

    /*
     * Liên kết ParkingSession với Booking.
     *
     * Nếu xe check-in theo booking:
     * booking != null
     *
     * Nếu xe vãng lai check-in thường:
     * booking = null
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    @JsonIgnoreProperties({
            "user",
            "vehicle",
            "slot",
            "hibernateLazyInitializer",
            "handler"
    })
    private Booking booking;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(length = 20)
    private String status;
}