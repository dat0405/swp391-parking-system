package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class LostTicketDTO {
    private Integer parkingSessionId;
    private Integer handledByUserId;
    private String reason;
}