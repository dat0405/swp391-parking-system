package com.tatdat.parking.backend.config;

import com.tatdat.parking.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
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
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh-token",
                                "/api/auth/logout",
                                "/api/test/**",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
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
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-facilities/**")
                        .hasAnyRole("DRIVER", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-floors/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-zones/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-zone-management/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-slots/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-sessions/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/pricing-policies/**")
                        .hasAnyRole("DRIVER", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/bookings/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/payments/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking-operations/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/parking/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/exceptions/**")
                        .hasAnyRole("PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .requestMatchers("/api/bookings/**")
                        .hasAnyRole("DRIVER", "PARKING_STAFF", "PARKING_MANAGER", "SYSTEM_ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
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