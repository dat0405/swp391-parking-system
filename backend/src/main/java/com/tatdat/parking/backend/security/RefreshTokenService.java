package com.tatdat.parking.backend.security;

import com.tatdat.parking.backend.entity.RefreshToken;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    public RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .revoked(false)
                .revokedAt(null)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            throw new RuntimeException("Refresh token is required");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));

        if (Boolean.TRUE.equals(refreshToken.getRevoked())) {
            throw new RuntimeException("Refresh token has been revoked");
        }

        if (refreshToken.getExpiryDate() == null ||
                refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {

            refreshToken.setRevoked(true);
            refreshToken.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);

            throw new RuntimeException("Refresh token expired");
        }

        return refreshToken;
    }

    public void revokeRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }

        refreshTokenRepository.findByToken(token.trim()).ifPresent(refreshToken -> {
            refreshToken.setRevoked(true);
            refreshToken.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);
        });
    }

    @Transactional
    public void deleteAllRefreshTokensByUser(User user) {
        if (user == null || user.getId() == null) {
            return;
        }

        refreshTokenRepository.deleteByUser(user);
    }
}