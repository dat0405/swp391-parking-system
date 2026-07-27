package com.tatdat.parking.backend.security;

import com.tatdat.parking.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private static final String USER_ID_CLAIM = "userId";
    private static final String ROLE_CLAIM = "role";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    /**
     * Tạo khóa dùng để ký và xác thực JWT.
     *
     * jwt.secret nên có độ dài tối thiểu 32 byte
     * khi sử dụng thuật toán HMAC SHA.
     */
    private SecretKey getSigningKey() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT secret has not been configured."
            );
        }

        return Keys.hmacShaKeyFor(
                jwtSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Chuẩn hóa role trước khi lưu vào JWT.
     *
     * Ví dụ:
     * ROLE_PARKING_STAFF -> PARKING_STAFF
     * parking_staff      -> PARKING_STAFF
     */
    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }

        String normalizedRole = role
                .trim()
                .toUpperCase();

        if (normalizedRole.startsWith("ROLE_")) {
            normalizedRole = normalizedRole.substring(5);
        }

        return normalizedRole;
    }

    /**
     * Tạo access token cho user.
     */
    public String generateAccessToken(User user) {
        if (user == null) {
            throw new IllegalArgumentException(
                    "Cannot generate access token because user is null."
            );
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException(
                    "Cannot generate access token because user email is missing."
            );
        }

        if (user.getId() == null) {
            throw new IllegalArgumentException(
                    "Cannot generate access token because user ID is missing."
            );
        }

        if (
                user.getRole() == null ||
                        user.getRole().getRoleName() == null
        ) {
            throw new IllegalArgumentException(
                    "Cannot generate access token because user role is missing."
            );
        }

        if (
                accessTokenExpiration == null ||
                        accessTokenExpiration <= 0
        ) {
            throw new IllegalStateException(
                    "JWT access token expiration must be greater than zero."
            );
        }

        String normalizedRole = normalizeRole(
                user.getRole().getRoleName()
        );

        if (normalizedRole == null) {
            throw new IllegalArgumentException(
                    "Cannot generate access token because user role is invalid."
            );
        }

        Date issuedAt = new Date();

        Date expiration = new Date(
                issuedAt.getTime() + accessTokenExpiration
        );

        return Jwts.builder()
                .subject(user.getEmail().trim().toLowerCase())
                .claim(USER_ID_CLAIM, user.getId())
                .claim(ROLE_CLAIM, normalizedRole)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Lấy email từ subject của JWT.
     *
     * Trả về null nếu token không hợp lệ.
     */
    public String extractEmail(String token) {
        Claims claims = tryExtractAllClaims(token);

        if (claims == null) {
            return null;
        }

        return claims.getSubject();
    }

    /**
     * Lấy user ID từ JWT.
     *
     * JJWT có thể deserialize số thành Integer, Long
     * hoặc một Number khác nên cần xử lý thông qua Number.
     */
    public Integer extractUserId(String token) {
        Claims claims = tryExtractAllClaims(token);

        if (claims == null) {
            return null;
        }

        Object userId = claims.get(USER_ID_CLAIM);

        if (userId == null) {
            return null;
        }

        if (userId instanceof Number number) {
            return number.intValue();
        }

        try {
            return Integer.valueOf(
                    String.valueOf(userId)
            );
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /**
     * Lấy role từ JWT.
     *
     * Kết quả luôn có dạng:
     * SYSTEM_ADMIN
     * PARKING_MANAGER
     * PARKING_STAFF
     * DRIVER
     * USER
     */
    public String extractRole(String token) {
        Claims claims = tryExtractAllClaims(token);

        if (claims == null) {
            return null;
        }

        Object role = claims.get(ROLE_CLAIM);

        if (role == null) {
            return null;
        }

        return normalizeRole(
                String.valueOf(role)
        );
    }

    /**
     * Kiểm tra token có hợp lệ với user hay không.
     */
    public boolean isTokenValid(
            String token,
            User user
    ) {
        if (
                token == null ||
                        token.isBlank() ||
                        user == null ||
                        user.getEmail() == null ||
                        user.getEmail().isBlank()
        ) {
            return false;
        }

        Claims claims = tryExtractAllClaims(token);

        if (claims == null) {
            return false;
        }

        String tokenEmail = claims.getSubject();
        Date expiration = claims.getExpiration();

        if (
                tokenEmail == null ||
                        tokenEmail.isBlank() ||
                        expiration == null
        ) {
            return false;
        }

        boolean sameUser = tokenEmail.equalsIgnoreCase(
                user.getEmail().trim()
        );

        boolean notExpired = expiration.after(
                new Date()
        );

        return sameUser && notExpired;
    }

    /**
     * Kiểm tra token đã hết hạn hay chưa.
     *
     * Token sai cấu trúc hoặc sai chữ ký cũng được xem
     * là không còn hợp lệ.
     */
    public boolean isTokenExpired(String token) {
        Claims claims = tryExtractAllClaims(token);

        if (
                claims == null ||
                        claims.getExpiration() == null
        ) {
            return true;
        }

        return claims
                .getExpiration()
                .before(new Date());
    }

    /**
     * Parse JWT và ném exception nếu token không hợp lệ.
     */
    private Claims extractAllClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException(
                    "JWT token must not be empty."
            );
        }

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Parse JWT an toàn.
     *
     * Không để JWT sai, hết hạn hoặc sai chữ ký
     * làm lỗi toàn bộ request trong authentication filter.
     */
    private Claims tryExtractAllClaims(String token) {
        try {
            return extractAllClaims(token);
        } catch (
                JwtException |
                IllegalArgumentException exception
        ) {
            return null;
        }
    }
}