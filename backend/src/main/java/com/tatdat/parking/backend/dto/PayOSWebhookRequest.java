package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayOSWebhookRequest {

    private String code;

    private String desc;

    private Boolean success;

    private PayOSWebhookData data;

    private String signature;
}