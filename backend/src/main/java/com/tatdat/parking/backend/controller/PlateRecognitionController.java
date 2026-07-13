package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.PlateRecognitionResponse;
import com.tatdat.parking.backend.service.PlateRecognitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/plate-recognition")
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
public class PlateRecognitionController {

    private final PlateRecognitionService plateRecognitionService;

    /**
     * Nhận ảnh biển số từ frontend và gửi sang Plate Recognizer Cloud.
     *
     * Multipart:
     * - image: ảnh biển số, bắt buộc.
     * - vehicleType: Car hoặc Motorbike, không bắt buộc.
     */
    @PostMapping("/scan")
    public ResponseEntity<PlateRecognitionResponse> scanPlate(
            @RequestParam("image") MultipartFile image,
            @RequestParam(
                    value = "vehicleType",
                    required = false
            ) String vehicleType
    ) {
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    PlateRecognitionResponse.builder()
                            .success(false)
                            .licensePlate("")
                            .vehicleType("")
                            .confidence(0.0)
                            .message("Vui lòng tải lên ảnh biển số xe.")
                            .build()
            );
        }

        PlateRecognitionResponse response =
                plateRecognitionService.scanPlate(
                        image,
                        vehicleType
                );

        return ResponseEntity.ok(response);
    }
}