package com.tatdat.parking.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateUserRequest {

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

    @Schema(example = "string")
    private String phone;

    @NotBlank(message = "Password is required")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,}$",
            message = "Password must be at least 8 characters and contain at least 1 uppercase letter, 1 number, and 1 special character"
    )
    @Schema(example = "string")
    private String password;

    @NotNull(message = "Role is required")
    @Schema(example = "3", description = "1=SYSTEM_ADMIN, 2=PARKING_MANAGER, 3=PARKING_STAFF, 4=DRIVER")
    private Integer roleId;
}