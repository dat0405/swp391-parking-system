package com.tatdat.parking.backend.security;

import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ACCESS_TOKEN_COOKIE = "access_token";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected boolean shouldNotFilter(
            @NonNull HttpServletRequest request
    ) {
        String path = request.getServletPath();

        /*
         * Bỏ qua CORS preflight.
         */
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        /*
         * Chỉ webhook PayOS được bỏ qua JWT.
         *
         * PayOS gọi endpoint này từ server của PayOS nên không có
         * access_token cookie của người dùng.
         *
         * Không được dùng startsWith("/api/payments/payos"),
         * vì API tạo QR cần xác thực người dùng.
         */
        if (path.equals("/api/payments/payos/webhook")) {
            return true;
        }

        /*
         * Endpoint lấy thông tin người dùng hiện tại phải đi qua JWT filter.
         */
        if (path.equals("/api/auth/me")) {
            return false;
        }

        /*
         * Các API xác thực public không cần JWT.
         */
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/test/")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui")
                || path.equals("/swagger-ui.html");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String token = resolveToken(request);

        /*
         * Không có token thì tiếp tục filter chain.
         * SecurityConfig sẽ quyết định endpoint đó public hay cần đăng nhập.
         */
        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String email = jwtService.extractEmail(token);

            if (email != null
                    && SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                User user = userRepository
                        .findByEmail(email)
                        .orElse(null);

                if (user == null) {
                    SecurityContextHolder.clearContext();

                    response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "User not found"
                    );

                    return;
                }

                if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                    SecurityContextHolder.clearContext();

                    response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "User account is not active"
                    );

                    return;
                }

                if (!jwtService.isTokenValid(token, user)) {
                    SecurityContextHolder.clearContext();

                    response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "Invalid access token"
                    );

                    return;
                }

                if (user.getRole() == null
                        || user.getRole().getRoleName() == null) {

                    SecurityContextHolder.clearContext();

                    response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "User role not found"
                    );

                    return;
                }

                String roleName = user
                        .getRole()
                        .getRoleName()
                        .trim()
                        .toUpperCase();

                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(
                                user.getEmail(),
                                null,
                                List.of(
                                        new SimpleGrantedAuthority(
                                                "ROLE_" + roleName
                                        )
                                )
                        );

                authenticationToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authenticationToken);
            }

            filterChain.doFilter(request, response);

        } catch (ExpiredJwtException exception) {
            SecurityContextHolder.clearContext();

            response.sendError(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Access token expired"
            );

        } catch (JwtException | IllegalArgumentException exception) {
            SecurityContextHolder.clearContext();

            response.sendError(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid access token"
            );
        }
    }

    private String resolveToken(
            HttpServletRequest request
    ) {
        String authHeader =
                request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader != null
                && authHeader.startsWith("Bearer ")) {

            return authHeader.substring(7);
        }

        return getCookieValue(
                request,
                ACCESS_TOKEN_COOKIE
        );
    }

    private String getCookieValue(
            HttpServletRequest request,
            String cookieName
    ) {
        Cookie[] cookies = request.getCookies();

        if (cookies == null || cookies.length == 0) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}