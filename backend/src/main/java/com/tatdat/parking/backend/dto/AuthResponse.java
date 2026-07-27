package com.tatdat.parking.backend.dto;

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
public class AuthResponse {

    /*
     * Hai trường này được giữ lại để tương thích
     * với frontend hoặc phiên bản xác thực cũ.
     *
     * Với cơ chế HttpOnly Cookie hiện tại,
     * AuthController sẽ trả về null cho hai trường này.
     */
    private String accessToken;
    private String refreshToken;

    /*
     * Thông tin không nhạy cảm được frontend sử dụng
     * để hiển thị người dùng và điều hướng theo role.
     */
    private Integer userId;
    private String fullName;
    private String email;

    /*
     * Một trong các role:
     *
     * SYSTEM_ADMIN
     * PARKING_MANAGER
     * PARKING_STAFF
     * DRIVER
     * USER
     */
    private String role;
}