package com.tatdat.parking.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {

    @NotBlank(message = "Status is required")
    @Pattern(
            regexp = "ACTIVE|INACTIVE|BANNED",
            message = "Status must be ACTIVE, INACTIVE, or BANNED"
    )
    private String status;
}