package com.tatdat.parking.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(
        description = "Dữ liệu System Admin sử dụng để tạo tài khoản mới"
)
public class CreateUserRequest {

    @NotBlank(
            message = "Full name is required"
    )
    @Size(
            min = 2,
            max = 100,
            message = "Full name must be between 2 and 100 characters"
    )
    @Schema(
            example = "Nguyen Van An",
            description = "Họ và tên người dùng"
    )
    private String fullName;

    @NotBlank(
            message = "Email is required"
    )
    @Email(
            message = "Email format is invalid"
    )
    @Size(
            max = 150,
            message = "Email must not exceed 150 characters"
    )
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@(gmail\\.com|outlook\\.com|hotmail\\.com|yahoo\\.com|icloud\\.com|fpt\\.edu\\.vn)$",
            message = "Email domain is not supported"
    )
    @Schema(
            example = "staff01@gmail.com",
            description = "Email đăng nhập của người dùng"
    )
    private String email;

    /*
     * Phone không bắt buộc.
     *
     * Ví dụ hợp lệ:
     * - 0912345678
     * - +84912345678
     */
    @Size(
            max = 20,
            message = "Phone number must not exceed 20 characters"
    )
    @Pattern(
            regexp = "^$|^\\+?[0-9]{9,15}$",
            message = "Phone number format is invalid"
    )
    @Schema(
            example = "0912345678",
            description = "Số điện thoại, không bắt buộc"
    )
    private String phone;

    @NotBlank(
            message = "Password is required"
    )
    @Size(
            min = 8,
            max = 100,
            message = "Password must be between 8 and 100 characters"
    )
    @Pattern(
            regexp = "^(?=\\S+$)(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,100}$",
            message = "Password must contain at least 1 uppercase letter, 1 number, 1 special character, and must not contain spaces"
    )
    @Schema(
            example = "Parking@123",
            description = "Mật khẩu đăng nhập"
    )
    private String password;

    @NotNull(
            message = "Role is required"
    )
    @Min(
            value = 1,
            message = "Role ID must be between 1 and 4"
    )
    @Max(
            value = 4,
            message = "Role ID must be between 1 and 4"
    )
    @Schema(
            example = "3",
            description = """
                    ID role của người dùng:
                    1 = SYSTEM_ADMIN
                    2 = PARKING_MANAGER
                    3 = PARKING_STAFF
                    4 = DRIVER

                    DRIVER cũng chính là người dùng thông thường
                    của hệ thống.
                    """
    )
    private Integer roleId;
}