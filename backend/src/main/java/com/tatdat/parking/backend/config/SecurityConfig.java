package com.tatdat.parking.backend.config;

import com.tatdat.parking.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        /*
         * Các role chính thức trong database:
         *
         * - SYSTEM_ADMIN
         * - PARKING_MANAGER
         * - PARKING_STAFF
         * - DRIVER
         *
         * DRIVER chính là người dùng thông thường.
         * Không tồn tại role USER riêng.
         */
        private static final String[] ALL_SYSTEM_ROLES = {
                "DRIVER",
                "PARKING_STAFF",
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        /*
         * Quyền quản lý:
         *
         * - Dashboard
         * - Parking Floors
         * - Reservations
         * - Pricing Policies
         * - Reports
         */
        private static final String[] MANAGEMENT_ROLES = {
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        /*
         * Quyền thao tác tại cổng:
         *
         * - Check-in
         * - Check-out
         * - Nhận diện biển số
         * - Thanh toán checkout
         *
         * PARKING_MANAGER không thuộc nhóm này.
         */
        private static final String[] GATE_ROLES = {
                "PARKING_STAFF",
                "SYSTEM_ADMIN"
        };

        /*
         * DRIVER được xem dữ liệu dành cho người dùng.
         * PARKING_MANAGER và SYSTEM_ADMIN được quản lý dữ liệu.
         */
        private static final String[] DRIVER_AND_MANAGEMENT_ROLES = {
                "DRIVER",
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        /*
         * Thống kê tầng được sử dụng bởi:
         *
         * - Dashboard của PARKING_MANAGER/SYSTEM_ADMIN.
         * - Check-in/out của PARKING_STAFF/SYSTEM_ADMIN.
         */
        private static final String[] FLOOR_STATS_ROLES = {
                "PARKING_STAFF",
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Value(
                "${app.cors.allowed-origins:" +
                        "http://localhost:5173," +
                        "http://localhost:5174," +
                        "http://localhost:3000}"
        )
        private String allowedOrigins;

        @Bean
        public SecurityFilterChain securityFilterChain(
                HttpSecurity http
        ) throws Exception {

                http
                        .cors(Customizer.withDefaults())
                        .csrf(CsrfConfigurer::disable)

                        .sessionManagement(session ->
                                session.sessionCreationPolicy(
                                        SessionCreationPolicy.STATELESS
                                )
                        )

                        .exceptionHandling(exception ->
                                exception
                                        .authenticationEntryPoint(
                                                new HttpStatusEntryPoint(
                                                        HttpStatus.UNAUTHORIZED
                                                )
                                        )
                                        .accessDeniedHandler(
                                                new AccessDeniedHandlerImpl()
                                        )
                        )

                        .authorizeHttpRequests(auth -> auth

                                /*
                                 * Cho phép CORS preflight.
                                 */
                                .requestMatchers(
                                        HttpMethod.OPTIONS,
                                        "/**"
                                )
                                .permitAll()

                                /*
                                 * Health check công khai.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/health"
                                )
                                .permitAll()

                                /*
                                 * PayOS gọi webhook từ server bên ngoài,
                                 * nên request không có JWT cookie của người dùng.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/webhook"
                                )
                                .permitAll()

                                /*
                                 * Phải đặt trước /api/auth/**.
                                 */
                                .requestMatchers(
                                        "/api/auth/me"
                                )
                                .authenticated()

                                /*
                                 * API đăng nhập, đăng ký, quên mật khẩu
                                 * và tài liệu Swagger.
                                 */
                                .requestMatchers(
                                        "/api/auth/**",
                                        "/v3/api-docs/**",
                                        "/swagger-ui/**",
                                        "/swagger-ui.html"
                                )
                                .permitAll()

                                /*
                                 * API quản trị cấp cao.
                                 */
                                .requestMatchers(
                                        "/api/admin/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * Mọi role đã đăng nhập đều được cập nhật
                                 * trạng thái online/offline của chính mình.
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/users/me/heartbeat",
                                        "/api/users/me/offline"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * Theo dõi trạng thái user chỉ dành cho Admin.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/users/status-stream"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * User Management chỉ dành cho Admin.
                                 */
                                .requestMatchers(
                                        "/api/users/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                .requestMatchers(
                                        "/api/roles/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * Notification:
                                 *
                                 * Mọi role đã đăng nhập đều được:
                                 * - Xem notification của chính mình.
                                 * - Xem số notification chưa đọc.
                                 * - Đánh dấu notification của chính mình là đã đọc.
                                 *
                                 * NotificationController và NotificationService
                                 * phải lấy user hiện tại từ JWT.
                                 *
                                 * Không cho frontend truyền userId tùy ý.
                                 */
                                .requestMatchers(
                                        "/api/notifications/**"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * DRIVER quản lý xe cá nhân.
                                 * PARKING_MANAGER/SYSTEM_ADMIN có thể xem và quản lý xe.
                                 *
                                 * PARKING_STAFF sử dụng API parking-operations,
                                 * không truy cập trực tiếp API vehicles.
                                 */
                                .requestMatchers(
                                        "/api/vehicles/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                /*
                                 * Tất cả role cần xem danh sách loại xe.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * Chỉ Manager/Admin được thay đổi loại xe.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Parking Facilities:
                                 *
                                 * DRIVER chỉ xem.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Parking Floors:
                                 *
                                 * DRIVER chỉ xem.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Parking Zones:
                                 *
                                 * DRIVER chỉ xem.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Parking Slots:
                                 *
                                 * DRIVER chỉ xem.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Parking Sessions:
                                 *
                                 * - DRIVER dùng trong luồng booking.
                                 * - PARKING_MANAGER/SYSTEM_ADMIN dùng cho báo cáo.
                                 * - PARKING_STAFF/SYSTEM_ADMIN dùng cho check-in/out.
                                 */
                                .requestMatchers(
                                        "/api/parking-sessions/**"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * Pricing Policies:
                                 *
                                 * DRIVER chỉ xem bảng giá.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Holiday surcharge:
                                 *
                                 * DRIVER chỉ xem.
                                 * PARKING_MANAGER/SYSTEM_ADMIN được quản lý.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(
                                        DRIVER_AND_MANAGEMENT_ROLES
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Booking cá nhân của DRIVER.
                                 *
                                 * Các matcher này phải nằm trước
                                 * matcher tổng quát /api/bookings/**.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/bookings/my-history",
                                        "/api/bookings/my-history/**",
                                        "/api/bookings/my-pending-payment"
                                )
                                .hasRole("DRIVER")

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/bookings/my-history/*/cancel"
                                )
                                .hasRole("DRIVER")

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/bookings",
                                        "/api/bookings/"
                                )
                                .hasRole("DRIVER")

                                /*
                                 * Không xóa vĩnh viễn lịch sử booking.
                                 */
                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/bookings/**"
                                )
                                .denyAll()

                                /*
                                 * Reservations:
                                 *
                                 * PARKING_MANAGER/SYSTEM_ADMIN xem và quản lý
                                 * toàn bộ booking.
                                 */
                                .requestMatchers(
                                        "/api/bookings/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * DRIVER tạo QR thanh toán booking.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create/*"
                                )
                                .hasRole("DRIVER")

                                /*
                                 * Kiểm tra trạng thái thanh toán.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/payments/payos/checkout-status/*"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * Thanh toán tại cổng checkout:
                                 *
                                 * Chỉ PARKING_STAFF và SYSTEM_ADMIN.
                                 * PARKING_MANAGER không được phép.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create-checkout"
                                )
                                .hasAnyRole(GATE_ROLES)

                                /*
                                 * Các API payment còn lại yêu cầu đăng nhập.
                                 */
                                .requestMatchers(
                                        "/api/payments/**"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /*
                                 * Nhận diện biển số:
                                 *
                                 * Chỉ PARKING_STAFF và SYSTEM_ADMIN.
                                 * PARKING_MANAGER không có quyền.
                                 */
                                .requestMatchers(
                                        "/api/plate-recognition/**"
                                )
                                .hasAnyRole(GATE_ROLES)

                                /*
                                 * Endpoint thống kê tầng.
                                 *
                                 * Đặt trước matcher tổng quát:
                                 * /api/parking-operations/**
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-operations/floor-stats"
                                )
                                .hasAnyRole(FLOOR_STATS_ROLES)

                                /*
                                 * Check-in/out và danh sách xe đang đỗ:
                                 *
                                 * Chỉ PARKING_STAFF và SYSTEM_ADMIN.
                                 * PARKING_MANAGER không có quyền.
                                 */
                                .requestMatchers(
                                        "/api/parking-operations/**"
                                )
                                .hasAnyRole(GATE_ROLES)

                                /*
                                 * Các API vận hành bãi xe khác:
                                 *
                                 * Chỉ PARKING_STAFF và SYSTEM_ADMIN.
                                 */
                                .requestMatchers(
                                        "/api/parking/**"
                                )
                                .hasAnyRole(GATE_ROLES)

                                /*
                                 * Dashboard:
                                 *
                                 * PARKING_MANAGER và SYSTEM_ADMIN.
                                 */
                                .requestMatchers(
                                        "/api/dashboard/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Reports:
                                 *
                                 * PARKING_MANAGER và SYSTEM_ADMIN.
                                 */
                                .requestMatchers(
                                        "/api/reports/**"
                                )
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Các endpoint đã đăng nhập nhưng chưa được
                                 * liệt kê cụ thể vẫn yêu cầu authentication.
                                 */
                                .anyRequest()
                                .authenticated()
                        )

                        .addFilterBefore(
                                jwtAuthenticationFilter,
                                UsernamePasswordAuthenticationFilter.class
                        );

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration =
                        new CorsConfiguration();

                List<String> origins =
                        Arrays.stream(
                                        allowedOrigins.split(",")
                                )
                                .map(String::trim)
                                .filter(origin ->
                                        !origin.isBlank()
                                )
                                .toList();

                configuration.setAllowedOrigins(
                        origins
                );

                configuration.setAllowedMethods(
                        List.of(
                                "GET",
                                "POST",
                                "PUT",
                                "PATCH",
                                "DELETE",
                                "OPTIONS"
                        )
                );

                configuration.setAllowedHeaders(
                        List.of("*")
                );

                configuration.setExposedHeaders(
                        List.of(
                                "Authorization"
                        )
                );

                configuration.setAllowCredentials(
                        true
                );

                configuration.setMaxAge(
                        3600L
                );

                UrlBasedCorsConfigurationSource source =
                        new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                        "/**",
                        configuration
                );

                return source;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }
}