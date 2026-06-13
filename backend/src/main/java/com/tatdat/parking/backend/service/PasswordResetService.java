package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.entity.PasswordResetToken;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.PasswordResetTokenRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    private static final SecureRandom secureRandom = new SecureRandom();

    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }

        String normalizedEmail = email.trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if ("BANNED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn đã bị khóa");
        }

        revokeOldPasswordResetTokens(user);

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .email(user.getEmail())
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .createdAt(LocalDateTime.now())
                .usedAt(null)
                .build();

        passwordResetTokenRepository.save(resetToken);

        emailService.sendPasswordResetOtp(user.getEmail(), otp);
    }

    public void resetPassword(String email, String otp, String newPassword) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }

        if (otp == null || otp.isBlank()) {
            throw new RuntimeException("OTP is required");
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }

        String normalizedEmail = email.trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if ("BANNED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn đã bị khóa");
        }

        List<PasswordResetToken> tokens =
                passwordResetTokenRepository.findByUserAndUsedFalseOrderByCreatedAtDesc(user);

        if (tokens.isEmpty()) {
            throw new RuntimeException("OTP not found");
        }

        PasswordResetToken resetToken = tokens.get(0);

        if (resetToken.getExpiryDate() == null ||
                resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {

            resetToken.setUsed(true);
            resetToken.setUsedAt(LocalDateTime.now());
            passwordResetTokenRepository.save(resetToken);

            throw new RuntimeException("OTP has expired");
        }

        if (!passwordEncoder.matches(otp.trim(), resetToken.getOtpHash())) {
            throw new RuntimeException("Invalid OTP");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        resetToken.setUsed(true);
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        refreshTokenService.deleteAllRefreshTokensByUser(user);
    }

    private void revokeOldPasswordResetTokens(User user) {
        List<PasswordResetToken> oldTokens =
                passwordResetTokenRepository.findByUserAndUsedFalseOrderByCreatedAtDesc(user);

        if (oldTokens.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (PasswordResetToken token : oldTokens) {
            token.setUsed(true);
            token.setUsedAt(now);
        }

        passwordResetTokenRepository.saveAll(oldTokens);
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }
}