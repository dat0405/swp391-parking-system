package com.tatdat.parking.backend.config;

import com.tatdat.parking.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
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
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(CsrfConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler(new AccessDeniedHandlerImpl())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        /*
                         * PayOS endpoints must be public.
                         *
                         * Reason:
                         * PayOS webhook is called from PayOS server.
                         * It does not send your JWT token.
                         *
                         * This rule must be placed BEFORE /api/payments/**.
                         */
                        .requestMatchers("/api/payments/payos/**").permitAll()

                        .requestMatchers("/api/auth/me").authenticated()

                        .requestMatchers(
                                "/api/auth/**",
                                "/api/test/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        .requestMatchers("/api/admin/**").hasRole("SYSTEM_ADMIN")
                        .requestMatchers("/api/users/**").hasRole("SYSTEM_ADMIN")
                        .requestMatchers("/api/roles/**").hasRole("SYSTEM_ADMIN")

                        .requestMatchers("/api/vehicles/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/vehicle-types/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/parking-facilities/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/parking-facilities/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/parking-facilities/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/api/parking-facilities/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/parking-floors/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/parking-floors/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/parking-floors/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/api/parking-floors/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/parking-zones/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/parking-zones/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/parking-zones/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/api/parking-zones/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/parking-slots/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Cho phép Staff / Manager / Admin đổi trạng thái slot:
                         * AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE.
                         */
                        .requestMatchers(HttpMethod.PUT, "/api/parking-slots/*/status")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PATCH, "/api/parking-slots/*/status")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Add slot chỉ cho Manager/Admin.
                         */
                        .requestMatchers(HttpMethod.POST, "/api/parking-slots/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Update slot thường chỉ cho Manager/Admin.
                         */
                        .requestMatchers(HttpMethod.PUT, "/api/parking-slots/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PATCH, "/api/parking-slots/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Delete slot chỉ cho Manager/Admin.
                         */
                        .requestMatchers(HttpMethod.DELETE, "/api/parking-slots/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-sessions/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/pricing-policies/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/pricing-policies/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/pricing-policies/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/api/pricing-policies/**")
                        .hasAnyRole("PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Reservation history must be kept for reports, exports,
                         * audit tracking, and operational transparency.
                         * Nobody can permanently delete booking records.
                         */
                        .requestMatchers(HttpMethod.DELETE, "/api/bookings/**")
                        .denyAll()

                        .requestMatchers("/api/bookings/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        /*
                         * Other payment APIs still require login.
                         *
                         * Note:
                         * /api/payments/payos/** has already been permitted above.
                         */
                        .requestMatchers("/api/payments/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-operations/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"
        ));

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}