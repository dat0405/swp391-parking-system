package com.tatdat.parking.backend.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCheckoutPayOSPaymentRequest {

    private String ticketId;

    private String licensePlate;

    private BigDecimal amount;

    private String description;

    /*
     * true khi khách bị mất vé.
     * Frontend gửi field này để QR PayOS / checkout flow biết đây là hóa đơn có phí mất vé.
     */
    private Boolean lostTicket;
}