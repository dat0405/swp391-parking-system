package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

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

    private Instant paymentCreatedAt;

    private Instant paymentExpiredAt;
}