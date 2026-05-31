package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.entity.PasswordResetToken;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.PasswordResetTokenRepository;
import com.tatdat.parking.backend.repository.UserRepository;
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

    private static final SecureRandom secureRandom = new SecureRandom();

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if ("BANNED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn đã bị khóa");
        }

        revokeOldTokens(user);

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .email(user.getEmail())
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        passwordResetTokenRepository.save(resetToken);

        emailService.sendPasswordResetOtp(user.getEmail(), otp);
    }

    public void resetPassword(String email, String otp, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email not found"));

        if ("BANNED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn đã bị khóa");
        }

        List<PasswordResetToken> tokens =
                passwordResetTokenRepository.findByUserAndUsedFalseOrderByCreatedAtDesc(user);

        if (tokens.isEmpty()) {
            throw new RuntimeException("OTP not found");
        }

        PasswordResetToken token = tokens.get(0);

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired");
        }

        if (!passwordEncoder.matches(otp, token.getOtpHash())) {
            throw new RuntimeException("Invalid OTP");
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new RuntimeException("New password is required");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        token.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(token);
    }

    private void revokeOldTokens(User user) {
        List<PasswordResetToken> oldTokens =
                passwordResetTokenRepository.findByUserAndUsedFalseOrderByCreatedAtDesc(user);

        for (PasswordResetToken token : oldTokens) {
            token.setUsed(true);
            token.setUsedAt(LocalDateTime.now());
        }

        passwordResetTokenRepository.saveAll(oldTokens);
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }
}