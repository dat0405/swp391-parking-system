package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreateCheckoutPayOSPaymentRequest;
import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSPaymentStatusResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;
import com.tatdat.parking.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/payos")
@RequiredArgsConstructor
public class PayOSPaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create/{bookingId}")
    public ResponseEntity<CreatePayOSPaymentResponse> createPayOSPayment(
            @PathVariable Integer bookingId
    ) throws Exception {
        return ResponseEntity.ok(
                paymentService.createPayOSPayment(bookingId)
        );
    }

    @PostMapping("/create-checkout")
    public ResponseEntity<CreatePayOSPaymentResponse> createCheckoutPayOSPayment(
            @Valid @RequestBody CreateCheckoutPayOSPaymentRequest request
    ) throws Exception {
        return ResponseEntity.ok(
                paymentService.createCheckoutPayOSPayment(request)
        );
    }

    @GetMapping("/checkout-status/{orderCode}")
    public ResponseEntity<PayOSPaymentStatusResponse> getCheckoutPaymentStatus(
            @PathVariable Long orderCode
    ) throws Exception {
        return ResponseEntity.ok(
                paymentService.getPayOSPaymentStatus(orderCode)
        );
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handlePayOSWebhook(
            @RequestBody PayOSWebhookRequest request
    ) throws Exception {
        paymentService.handlePayOSWebhook(request);
        return ResponseEntity.ok("OK");
    }
}
