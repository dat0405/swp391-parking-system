package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayOSPaymentStatusResponse {

    private Long orderCode;

    private String paymentStatus;

    private Integer amount;

    private String paymentLinkId;
}
