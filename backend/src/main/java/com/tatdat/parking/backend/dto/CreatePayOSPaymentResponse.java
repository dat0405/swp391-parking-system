package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePayOSPaymentResponse {

    private Integer bookingId;

    private Long orderCode;

    private Integer amount;

    private String currency;

    private String bookingStatus;

    private String paymentStatus;

    private String paymentLinkId;

    private String checkoutUrl;

    private String qrCode;
}