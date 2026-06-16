package com.tatdat.parking.backend.entity;

import com.tatdat.parking.backend.enums.ExceptionStatus;
import com.tatdat.parking.backend.enums.ExceptionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "parking_exceptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// Hoặc parkingSession HOẶC bookingHistory (một trong hai phải không được rỗng)
public class ParkingException {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "parking_session_id")
    private ParkingSession parkingSession;

    @ManyToOne
    @JoinColumn(name = "booking_history_id")
    private BookingHistory bookingHistory;

    @ManyToOne
    @JoinColumn(name = "handled_by", nullable = false)
    private User handledBy;

    @Enumerated(EnumType.STRING)
    private ExceptionType type;

    @Enumerated(EnumType.STRING)
    private ExceptionStatus status = ExceptionStatus.PENDING;

    private BigDecimal originalAmount;
    private BigDecimal finalAmount;

    private String reason;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}

