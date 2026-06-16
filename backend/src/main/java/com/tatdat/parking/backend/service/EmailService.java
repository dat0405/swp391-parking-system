package com.tatdat.parking.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendPasswordResetOtp(String toEmail, String otpCode) {
        if (toEmail == null || toEmail.isBlank()) {
            throw new RuntimeException("Recipient email is required");
        }

        String recipientEmail = toEmail.trim().toLowerCase();
        String senderEmail = fromEmail.trim().toLowerCase();

        if (recipientEmail.equals(senderEmail)) {
            throw new RuntimeException(
                    "Cannot send password reset OTP to system sender email"
            );
        }

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject("Parking system password reset OTP");
        message.setText(
                "Your password reset OTP is: " + otpCode + "\n\n" +
                        "This code will expire in 10 minutes.\n\n" +
                        "If you did not request a password reset, please ignore this email."
        );

        mailSender.send(message);
    }
}