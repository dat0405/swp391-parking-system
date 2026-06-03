package com.tatdat.parking.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Schema(example = "Nguyen Van A")
    private String fullName;

    @Email(message = "Email format is invalid")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@(gmail\\.com|outlook\\.com|hotmail\\.com|yahoo\\.com|icloud\\.com|fpt\\.edu\\.vn)$",
            message = "Email domain is not supported"
    )
    @Schema(example = "user@gmail.com")
    private String email;

    @Schema(example = "0900000000")
    private String phone;
}