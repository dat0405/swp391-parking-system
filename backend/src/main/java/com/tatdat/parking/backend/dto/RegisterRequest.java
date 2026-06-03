package com.tatdat.parking.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Schema(example = "string")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@(gmail\\.com|outlook\\.com|hotmail\\.com|yahoo\\.com|icloud\\.com|fpt\\.edu\\.vn)$",
            message = "Email domain is not supported"
    )
    @Schema(example = "string")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Schema(example = "string")
    private String password;

    @NotBlank(message = "Confirm password is required")
    @Schema(example = "string")
    private String confirmPassword;

    @NotBlank(message = "Phone is required")
    @Pattern(
            regexp = "^(0[0-9]{9})$",
            message = "Phone number format is invalid"
    )
    @Schema(example = "string")
    private String phone;
}