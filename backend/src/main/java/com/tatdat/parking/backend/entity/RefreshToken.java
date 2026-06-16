package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "token", nullable = false, unique = true, length = 500)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

    @Column(name = "revoked", nullable = false)
    private Boolean revoked;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (revoked == null) {
            revoked = false;
        }

        if (!revoked) {
            revokedAt = null;
        }

        if (revoked && revokedAt == null) {
            revokedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (revoked == null) {
            revoked = false;
        }

        if (!revoked) {
            revokedAt = null;
        }

        if (revoked && revokedAt == null) {
            revokedAt = LocalDateTime.now();
        }
    }
}