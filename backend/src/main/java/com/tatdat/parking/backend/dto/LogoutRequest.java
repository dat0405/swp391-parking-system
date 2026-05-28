package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class LogoutRequest {

    private String refreshToken;
}