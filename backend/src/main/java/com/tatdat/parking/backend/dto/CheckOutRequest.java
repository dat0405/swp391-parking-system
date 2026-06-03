package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class CheckOutRequest {

    private String licensePlate;

    private String paymentMethod;
}