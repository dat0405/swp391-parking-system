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

                                /*
                                 * Public health-check endpoint for Northflank.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/health"
                                )
                                .permitAll()

                                /*
                                 * Only the PayOS webhook is public because it is called
                                 * by the PayOS server and does not contain the user's JWT.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/webhook"
                                )
                                .permitAll()

                                .requestMatchers(
                                        "/api/auth/me"
                                )
                                .authenticated()

                                .requestMatchers(
                                        "/api/auth/**",
                                        "/api/test/**",
                                        "/v3/api-docs/**",
                                        "/swagger-ui/**",
                                        "/swagger-ui.html"
                                )
                                .permitAll()

                                .requestMatchers(
                                        "/api/admin/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * Current-user online status endpoints.
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/users/me/heartbeat",
                                        "/api/users/me/offline"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/users/status-stream"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        "/api/users/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                .requestMatchers(
                                        "/api/roles/**"
                                )
                                .hasRole("SYSTEM_ADMIN")

                                /*
                                 * Vehicle APIs.
                                 */
                                .requestMatchers(
                                        "/api/vehicles/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Vehicle type APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/vehicle-types/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Parking facility APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-facilities/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Parking floor APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-floors/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Parking zone APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-zones/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Parking slot APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-slots/*/status"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-slots/*/status"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/parking-slots/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Parking session APIs.
                                 */
                                .requestMatchers(
                                        "/api/parking-sessions/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Pricing policy APIs.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/pricing-policies/**"
                                )
                                .hasAnyRole(
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Personal booking history.
                                 * These rules must stay before /api/bookings/**.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/bookings/my-history",
                                        "/api/bookings/my-history/**",
                                        "/api/bookings/my-pending-payment"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER"
                                )

                                /*
                                 * DRIVER/USER may cancel only their own
                                 * pending-payment booking.
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/bookings/my-history/*/cancel"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER"
                                )

                                /*
                                 * Create a new booking.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/bookings",
                                        "/api/bookings/"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER"
                                )

                                /*
                                 * Booking records are never permanently deleted.
                                 */
                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/bookings/**"
                                )
                                .denyAll()

                                /*
                                 * Remaining booking-management APIs.
                                 */
                                .requestMatchers(
                                        "/api/bookings/**"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Driver/User creates the QR only for a personal booking.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create/*"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER"
                                )

                                /*
                                 * Payment status can be checked by the booking user
                                 * and operational staff.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/payments/payos/checkout-status/*"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Checkout payment at the parking lot is an
                                 * operational staff action.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/payments/payos/create-checkout"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Remaining payment/report APIs.
                                 */
                                .requestMatchers(
                                        "/api/payments/**"
                                )
                                .hasAnyRole(
                                        "DRIVER",
                                        "USER",
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                /*
                                 * Check-in/check-out APIs.
                                 */
                                .requestMatchers(
                                        "/api/parking-operations/**"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

                                .requestMatchers(
                                        "/api/parking/**"
                                )
                                .hasAnyRole(
                                        "PARKING_STAFF",
                                        "PARKING_MANAGER",
                                        "SYSTEM_ADMIN"
                                )

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

                configuration.setAllowedHeaders(
                        List.of("*")
                );

                configuration.setExposedHeaders(
                        List.of("Authorization")
                );

                configuration.setAllowCredentials(true);

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