package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayOSWebhookData {

    private Long orderCode;

    private Integer amount;

    private String description;

    private String accountNumber;

    private String reference;

    private String transactionDateTime;

    private String currency;

    private String paymentLinkId;

    private String code;

    private String desc;

    private String counterAccountBankId;

    private String counterAccountBankName;

    private String counterAccountName;

    private String counterAccountNumber;

    private String virtualAccountName;

    private String virtualAccountNumber;
}