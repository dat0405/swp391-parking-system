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
         * Database roles:
         * - SYSTEM_ADMIN
         * - PARKING_MANAGER
         * - PARKING_STAFF
         * - DRIVER
         *
         * DRIVER is the normal end-user role.
         * There is no separate USER role.
         */
        private static final String[] ALL_SYSTEM_ROLES = {
                "DRIVER",
                "PARKING_STAFF",
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        private static final String[] MANAGEMENT_ROLES = {
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        private static final String[] OPERATIONAL_ROLES = {
                "PARKING_STAFF",
                "PARKING_MANAGER",
                "SYSTEM_ADMIN"
        };

        private static final String[] DRIVER_AND_MANAGEMENT_ROLES = {
                "DRIVER",
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
                        .exceptionHandling(exception -> exception
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
                                .requestMatchers(
                                        HttpMethod.OPTIONS,
                                        "/**"
                                )
                                .permitAll()

                                /* Public health check. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/health"
                                )
                                .permitAll()

                                /*
                                 * PayOS calls this webhook from its own server,
                                 * so it does not contain the user's JWT cookie.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/webhook"
                                )
                                .permitAll()

                                /* Must stay before /api/auth/**. */
                                .requestMatchers("/api/auth/me")
                                .authenticated()

                                .requestMatchers(
                                        "/api/auth/**",
                                        "/v3/api-docs/**",
                                        "/swagger-ui/**",
                                        "/swagger-ui.html"
                                )
                                .permitAll()

                                /* System administrator APIs. */
                                .requestMatchers("/api/admin/**")
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * Every authenticated role may update its own
                                 * online/offline status.
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/users/me/heartbeat",
                                        "/api/users/me/offline"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /* User-management live status is admin-only. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/users/status-stream"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                .requestMatchers("/api/users/**")
                                .hasRole("SYSTEM_ADMIN")

                                .requestMatchers("/api/roles/**")
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * DRIVER may manage personal vehicles.
                                 * Manager/Admin may inspect or manage vehicles.
                                 * Staff uses parking-operation APIs instead.
                                 */
                                .requestMatchers("/api/vehicles/**")
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

                                /* Vehicle types are needed by booking and gate pages. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

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

                                /* Parking facility read-only access. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

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

                                /* Parking floor read-only access. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

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

                                /* Parking zone read-only access. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

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

                                /* Parking slot read-only access. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

                                /*
                                 * Direct slot-management endpoints are reserved for
                                 * Manager/Admin. Check-in/out changes slot state through
                                 * parking-operation services.
                                 */
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

                                /* Parking sessions support booking and gate operations. */
                                .requestMatchers("/api/parking-sessions/**")
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /* Price list and pricing management. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

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

                                /* Holiday surcharge list and management. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/holidays/**"
                                )
                                .hasAnyRole(DRIVER_AND_MANAGEMENT_ROLES)

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
                                 * Personal booking APIs for DRIVER.
                                 * These rules must stay before /api/bookings/**.
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

                                /* Booking records must not be permanently deleted. */
                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/bookings/**"
                                )
                                .denyAll()

                                /* Reservation management page: Manager/Admin only. */
                                .requestMatchers("/api/bookings/**")
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /* Personal PayOS booking QR for DRIVER. */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create/*"
                                )
                                .hasRole("DRIVER")

                                /* Checkout status is used by drivers and gate roles. */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/payments/payos/checkout-status/*"
                                )
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /* Gate checkout payment. */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create-checkout"
                                )
                                .hasAnyRole(OPERATIONAL_ROLES)

                                /* Remaining payment APIs still require a system role. */
                                .requestMatchers("/api/payments/**")
                                .hasAnyRole(ALL_SYSTEM_ROLES)

                                /* OCR and gate operations. */
                                .requestMatchers("/api/plate-recognition/**")
                                .hasAnyRole(OPERATIONAL_ROLES)

                                .requestMatchers("/api/parking-operations/**")
                                .hasAnyRole(OPERATIONAL_ROLES)

                                .requestMatchers("/api/parking/**")
                                .hasAnyRole(OPERATIONAL_ROLES)

                                /* Dashboard and reports. */
                                .requestMatchers("/api/dashboard/**")
                                .hasAnyRole(MANAGEMENT_ROLES)

                                .requestMatchers("/api/reports/**")
                                .hasAnyRole(MANAGEMENT_ROLES)

                                /*
                                 * Keep authenticated as the final fallback so existing
                                 * authenticated endpoints not listed above continue to work.
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

                List<String> origins = Arrays.stream(
                                allowedOrigins.split(",")
                        )
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toList();

                configuration.setAllowedOrigins(origins);

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

                configuration.setAllowedHeaders(List.of("*"));
                configuration.setExposedHeaders(
                        List.of("Authorization")
                );
                configuration.setAllowCredentials(true);
                configuration.setMaxAge(3600L);

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
