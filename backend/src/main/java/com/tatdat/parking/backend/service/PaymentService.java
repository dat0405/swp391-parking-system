package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;

public interface PaymentService {

    CreatePayOSPaymentResponse createPayOSPayment(Integer bookingId) throws Exception;

    void handlePayOSWebhook(PayOSWebhookRequest request) throws Exception;
}