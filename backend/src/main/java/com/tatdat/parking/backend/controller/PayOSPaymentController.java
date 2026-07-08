package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreatePayOSPaymentResponse;
import com.tatdat.parking.backend.dto.PayOSWebhookRequest;
import com.tatdat.parking.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/payos")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"
        },
        allowedHeaders = "*",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.PATCH,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        },
        allowCredentials = "true"
)
public class PayOSPaymentController {

    private final PaymentService paymentService;

    /*
     * FE gọi API này sau khi tạo booking thành công.
     *
     * Example:
     * POST /api/payments/payos/create/15
     */
    @PostMapping("/create/{bookingId}")
    public ResponseEntity<CreatePayOSPaymentResponse> createPayOSPayment(
            @PathVariable Integer bookingId
    ) throws Exception {
        return ResponseEntity.ok(
                paymentService.createPayOSPayment(bookingId)
        );
    }

    /*
     * PayOS gọi API này sau khi user thanh toán.
     *
     * Webhook URL khi test local bằng ngrok:
     * https://xxxxx.ngrok-free.app/api/payments/payos/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handlePayOSWebhook(
            @RequestBody PayOSWebhookRequest request
    ) throws Exception {
        paymentService.handlePayOSWebhook(request);
        return ResponseEntity.ok("OK");
    }
}