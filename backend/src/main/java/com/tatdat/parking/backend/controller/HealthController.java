package com.tatdat.parking.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put("status", "UP");
        response.put("service", "swp391-parking-backend");
        response.put("time", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }
}