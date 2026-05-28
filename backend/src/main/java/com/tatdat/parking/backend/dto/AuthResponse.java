package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private Integer userId;
    private String fullName;
    private String email;
    private String role;
}