package com.tatdat.parking.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ManualFeeAdjustmentDTO {
    private Integer parkingSessionId;
    private Integer handledByUserId;
    private BigDecimal finalAmount;  // staff nhập tay số tiền cuối
    private String reason;
}