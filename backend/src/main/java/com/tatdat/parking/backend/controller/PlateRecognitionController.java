package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.PlateRecognitionResponse;
import com.tatdat.parking.backend.service.PlateRecognitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/plate-recognition")
@RequiredArgsConstructor
public class PlateRecognitionController {

    private static final long MAX_IMAGE_SIZE_BYTES =
            10L * 1024L * 1024L;

    private static final String VEHICLE_TYPE_CAR =
            "Car";

    private static final String VEHICLE_TYPE_MOTORBIKE =
            "Motorbike";

    private static final String MODE_ACCURATE =
            "accurate";

    private static final String MODE_FAST =
            "fast";

    private static final Set<String> SUPPORTED_MODES =
            Set.of(
                    MODE_ACCURATE,
                    MODE_FAST
            );

    private final PlateRecognitionService plateRecognitionService;

    /**
     * Nhận ảnh biển số từ frontend và gửi sang OCR service.
     *
     * Multipart:
     * - image: ảnh biển số, bắt buộc.
     * - vehicleType: Car hoặc Motorbike, không bắt buộc.
     * - mode: accurate hoặc fast, không bắt buộc.
     *
     * Quyền truy cập endpoint này được kiểm soát trong
     * SecurityConfig cho:
     *
     * - PARKING_STAFF
     * - PARKING_MANAGER
     * - SYSTEM_ADMIN
     */
    @PostMapping(
            value = "/scan",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<PlateRecognitionResponse> scanPlate(
            @RequestParam("image")
            MultipartFile image,

            @RequestParam(
                    value = "vehicleType",
                    required = false
            )
            String vehicleType,

            @RequestParam(
                    value = "mode",
                    required = false,
                    defaultValue = MODE_ACCURATE
            )
            String mode
    ) {
        PlateRecognitionResponse validationError =
                validateImage(image);

        if (validationError != null) {
            return ResponseEntity
                    .badRequest()
                    .body(validationError);
        }

        String normalizedVehicleType;

        try {
            normalizedVehicleType =
                    normalizeVehicleType(
                            vehicleType
                    );
        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            buildErrorResponse(
                                    exception.getMessage()
                            )
                    );
        }

        try {
            validateMode(mode);

            PlateRecognitionResponse result =
                    plateRecognitionService.scanPlate(
                            image,
                            normalizedVehicleType
                    );

            if (result == null) {
                return ResponseEntity
                        .status(
                                HttpStatus.BAD_GATEWAY
                        )
                        .body(
                                buildErrorResponse(
                                        "OCR service không trả về kết quả."
                                )
                        );
            }

            /*
             * Bảo đảm frontend luôn nhận được
             * các giá trị không null.
             */
            PlateRecognitionResponse normalizedResponse =
                    PlateRecognitionResponse.builder()
                            .success(
                                    Boolean.TRUE.equals(
                                            result.getSuccess()
                                    )
                            )
                            .licensePlate(
                                    normalizeResponseText(
                                            result.getLicensePlate()
                                    )
                            )
                            .vehicleType(
                                    normalizeResponseVehicleType(
                                            result.getVehicleType(),
                                            normalizedVehicleType
                                    )
                            )
                            .confidence(
                                    normalizeConfidence(
                                            result.getConfidence()
                                    )
                            )
                            .message(
                                    normalizeResponseMessage(
                                            result
                                    )
                            )
                            .build();

            return ResponseEntity.ok(
                    normalizedResponse
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            buildErrorResponse(
                                    exception.getMessage()
                            )
                    );

        } catch (Exception exception) {
            return ResponseEntity
                    .status(
                            HttpStatus.BAD_GATEWAY
                    )
                    .body(
                            buildErrorResponse(
                                    "Không thể kết nối hoặc xử lý kết quả từ OCR service."
                            )
                    );
        }
    }

    /**
     * Kiểm tra file ảnh trước khi gửi sang OCR service.
     */
    private PlateRecognitionResponse validateImage(
            MultipartFile image
    ) {
        if (
                image == null ||
                        image.isEmpty()
        ) {
            return buildErrorResponse(
                    "Vui lòng tải lên ảnh biển số xe."
            );
        }

        if (
                image.getSize() >
                        MAX_IMAGE_SIZE_BYTES
        ) {
            return buildErrorResponse(
                    "Kích thước ảnh không được vượt quá 10 MB."
            );
        }

        String contentType =
                image.getContentType();

        /*
         * Một số trình duyệt hoặc thiết bị có thể gửi
         * application/octet-stream cho file ảnh.
         */
        boolean validContentType =
                contentType == null ||
                        contentType.isBlank() ||
                        contentType
                                .toLowerCase(Locale.ROOT)
                                .startsWith("image/") ||
                        MediaType.APPLICATION_OCTET_STREAM_VALUE
                                .equalsIgnoreCase(contentType);

        if (!validContentType) {
            return buildErrorResponse(
                    "File tải lên phải là một hình ảnh hợp lệ."
            );
        }

        return null;
    }

    /**
     * Chuẩn hóa loại xe từ frontend.
     *
     * Giá trị null hoặc rỗng được cho phép vì OCR service
     * có thể tự phát hiện loại phương tiện.
     */
    private String normalizeVehicleType(
            String vehicleType
    ) {
        if (
                vehicleType == null ||
                        vehicleType.isBlank()
        ) {
            return null;
        }

        String normalized =
                vehicleType
                        .trim()
                        .toLowerCase(Locale.ROOT);

        if (
                normalized.equals("car") ||
                        normalized.equals("cars") ||
                        normalized.equals("oto") ||
                        normalized.equals("ô tô") ||
                        normalized.equals("automobile")
        ) {
            return VEHICLE_TYPE_CAR;
        }

        if (
                normalized.equals("motorbike") ||
                        normalized.equals("motorbikes") ||
                        normalized.equals("motorcycle") ||
                        normalized.equals("bike") ||
                        normalized.equals("xe máy")
        ) {
            return VEHICLE_TYPE_MOTORBIKE;
        }

        throw new IllegalArgumentException(
                "Vehicle type phải là Car hoặc Motorbike."
        );
    }

    /**
     * Kiểm tra chế độ OCR gửi từ frontend.
     *
     * Hiện tại service vẫn sử dụng cùng một phương thức scan.
     * Tham số mode được nhận để tương thích với frontend
     * và sẵn sàng cho việc hỗ trợ fast/accurate trong service.
     */
    private void validateMode(
            String mode
    ) {
        if (
                mode == null ||
                        mode.isBlank()
        ) {
            return;
        }

        String normalizedMode =
                mode
                        .trim()
                        .toLowerCase(Locale.ROOT);

        if (
                !SUPPORTED_MODES.contains(
                        normalizedMode
                )
        ) {
            throw new IllegalArgumentException(
                    "OCR mode phải là accurate hoặc fast."
            );
        }
    }

    /**
     * Chuẩn hóa confidence về khoảng từ 0 đến 1.
     *
     * Hỗ trợ cả hai dạng OCR response:
     * - 0.85
     * - 85
     */
    private Double normalizeConfidence(
            Double confidence
    ) {
        if (confidence == null) {
            return 0.0;
        }

        double normalized = confidence;

        if (normalized > 1.0) {
            normalized = normalized / 100.0;
        }

        if (normalized < 0.0) {
            return 0.0;
        }

        if (normalized > 1.0) {
            return 1.0;
        }

        return normalized;
    }

    private String normalizeResponseVehicleType(
            String responseVehicleType,
            String requestedVehicleType
    ) {
        if (
                responseVehicleType != null &&
                        !responseVehicleType.isBlank()
        ) {
            try {
                return normalizeVehicleType(
                        responseVehicleType
                );
            } catch (IllegalArgumentException ignored) {
                return responseVehicleType.trim();
            }
        }

        return requestedVehicleType == null
                ? ""
                : requestedVehicleType;
    }

    private String normalizeResponseMessage(
            PlateRecognitionResponse response
    ) {
        if (
                response.getMessage() != null &&
                        !response.getMessage().isBlank()
        ) {
            return response
                    .getMessage()
                    .trim();
        }

        if (
                Boolean.TRUE.equals(
                        response.getSuccess()
                )
        ) {
            return "Nhận diện biển số thành công.";
        }

        return "Không thể nhận diện biển số từ ảnh đã tải lên.";
    }

    private String normalizeResponseText(
            String value
    ) {
        if (
                value == null ||
                        value.isBlank()
        ) {
            return "";
        }

        return value
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private PlateRecognitionResponse buildErrorResponse(
            String message
    ) {
        return PlateRecognitionResponse.builder()
                .success(false)
                .licensePlate("")
                .vehicleType("")
                .confidence(0.0)
                .message(
                        message == null ||
                                message.isBlank()
                                ? "Không thể xử lý ảnh biển số."
                                : message
                )
                .build();
    }
}