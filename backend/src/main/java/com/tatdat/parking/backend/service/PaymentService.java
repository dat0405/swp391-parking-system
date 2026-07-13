package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.CreateCheckoutPayOSPaymentRequest;
import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSPaymentStatusResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;

public interface PaymentService {

    CreatePayOSPaymentResponse createPayOSPayment(
            Integer bookingId
    ) throws Exception;

    CreatePayOSPaymentResponse createCheckoutPayOSPayment(
            CreateCheckoutPayOSPaymentRequest request
    ) throws Exception;

    PayOSPaymentStatusResponse getPayOSPaymentStatus(
            Long orderCode
    ) throws Exception;

    void handlePayOSWebhook(
            PayOSWebhookRequest request
    ) throws Exception;
}
