package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class ResetForgotPasswordRequest {

    private String email;
    private String otp;
    private String newPassword;
}