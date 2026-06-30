package com.tatdat.parking.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleAccessTokenRequest {

    @NotBlank(message = "Google access token is required")
    private String accessToken;
}