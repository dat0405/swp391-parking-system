package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class CheckOutRequest {

    private String licensePlate;

    private String ticketId;

    private String paymentMethod;

    /*
     * true when customer lost the QR ticket / physical ticket.
     * Backend adds a fixed 10,000 VND penalty to checkout amount.
     */
    private Boolean lostTicket;
}
