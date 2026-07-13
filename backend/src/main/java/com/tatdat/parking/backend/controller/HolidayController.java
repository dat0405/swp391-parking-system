package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.Holiday;
import com.tatdat.parking.backend.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"
        },
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.PATCH,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        },
        allowCredentials = "true"
)
public class HolidayController {

    private final HolidayRepository holidayRepository;

    @GetMapping
    public List<Holiday> getAllHolidays() {
        return holidayRepository.findAll();
    }

    @GetMapping("/active")
    public List<Holiday> getActiveHolidays() {
        return holidayRepository.findActiveHolidays();
    }

    @GetMapping("/{id}")
    public Holiday getHolidayById(@PathVariable Integer id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Holiday not found"));
    }

    @PostMapping
    public Holiday createHoliday(@RequestBody Holiday request) {
        validateHolidayRequest(request);

        Holiday holiday = Holiday.builder()
                .holidayName(request.getHolidayName().trim())
                .holidayDate(request.getHolidayDate())
                .surchargeType(normalizeSurchargeType(request.getSurchargeType()))
                .surchargeValue(request.getSurchargeValue())
                .isActive(request.getIsActive() == null ? true : request.getIsActive())
                .build();

        return holidayRepository.save(holiday);
    }

    @PutMapping("/{id}")
    public Holiday updateHoliday(
            @PathVariable Integer id,
            @RequestBody Holiday request
    ) {
        validateHolidayRequest(request);

        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Holiday not found"));

        holiday.setHolidayName(request.getHolidayName().trim());
        holiday.setHolidayDate(request.getHolidayDate());
        holiday.setSurchargeType(normalizeSurchargeType(request.getSurchargeType()));
        holiday.setSurchargeValue(request.getSurchargeValue());
        holiday.setIsActive(request.getIsActive() == null ? true : request.getIsActive());

        return holidayRepository.save(holiday);
    }

    @PatchMapping("/{id}/status")
    public Holiday updateHolidayStatus(
            @PathVariable Integer id,
            @RequestParam Boolean isActive
    ) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Holiday not found"));

        holiday.setIsActive(isActive);

        return holidayRepository.save(holiday);
    }

    @DeleteMapping("/{id}")
    public String deleteHoliday(@PathVariable Integer id) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Holiday not found"));

        holidayRepository.delete(holiday);

        return "Holiday deleted successfully";
    }

    private void validateHolidayRequest(Holiday request) {
        if (request == null) {
            throw new RuntimeException("Holiday request is required");
        }

        if (request.getHolidayName() == null || request.getHolidayName().trim().isEmpty()) {
            throw new RuntimeException("Holiday name is required");
        }

        if (request.getHolidayDate() == null) {
            throw new RuntimeException("Holiday date is required");
        }

        if (request.getSurchargeType() == null || request.getSurchargeType().trim().isEmpty()) {
            throw new RuntimeException("Surcharge type is required");
        }

        String surchargeType = normalizeSurchargeType(request.getSurchargeType());

        if (!"PERCENT".equals(surchargeType) && !"FIXED".equals(surchargeType)) {
            throw new RuntimeException("Surcharge type must be PERCENT or FIXED");
        }

        if (request.getSurchargeValue() == null) {
            throw new RuntimeException("Surcharge value is required");
        }

        if (request.getSurchargeValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Surcharge value cannot be negative");
        }

        if ("PERCENT".equals(surchargeType)
                && request.getSurchargeValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("Percent surcharge cannot be greater than 100");
        }
    }

    private String normalizeSurchargeType(String surchargeType) {
        return surchargeType == null
                ? "PERCENT"
                : surchargeType.trim().toUpperCase();
    }
}