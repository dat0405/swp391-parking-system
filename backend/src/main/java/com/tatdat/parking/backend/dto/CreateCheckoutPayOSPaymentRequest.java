package com.tatdat.parking.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCheckoutPayOSPaymentRequest {

    @NotBlank(message = "Ticket ID is required")
    private String ticketId;

    private String licensePlate;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(
            value = "0.01",
            message = "Payment amount must be greater than 0"
    )
    private BigDecimal amount;

    private String description;
}