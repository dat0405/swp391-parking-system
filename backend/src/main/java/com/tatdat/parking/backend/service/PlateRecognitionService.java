package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.PlateRecognitionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PlateRecognitionService {

    private final RestTemplate restTemplate;

    @Value("${plate-recognizer.api-url}")
    private String apiUrl;

    @Value("${plate-recognizer.api-token:}")
    private String apiToken;

    @Value("${plate-recognizer.region:vn}")
    private String region;

    @Value("${plate-recognizer.min-confidence:0.75}")
    private double minimumConfidence;

    public PlateRecognitionService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Controller hiện tại chỉ gửi ảnh thì sử dụng phương thức này.
     */
    public PlateRecognitionResponse scanPlate(MultipartFile image) {
        return scanPlate(image, null);
    }

    /**
     * Có thể truyền thêm loại xe do người dùng chọn:
     * Car hoặc Motorbike.
     */
    public PlateRecognitionResponse scanPlate(
            MultipartFile image,
            String requestedVehicleType
    ) {
        if (image == null || image.isEmpty()) {
            return createFailureResponse("Vui lòng tải lên ảnh biển số xe.");
        }

        if (apiToken == null || apiToken.isBlank()) {
            return createFailureResponse(
                    "Chưa cấu hình PLATE_RECOGNIZER_TOKEN trong backend."
            );
        }

        try {
            ByteArrayResource imageResource =
                    createImageResource(image);

            HttpEntity<ByteArrayResource> imagePart =
                    createImagePart(image, imageResource);

            MultiValueMap<String, Object> requestBody =
                    new LinkedMultiValueMap<>();

            /*
             * Plate Recognizer sử dụng tên multipart field là "upload".
             */
            requestBody.add("upload", imagePart);

            if (region != null && !region.isBlank()) {
                requestBody.add("regions", region.trim());
            }

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
            requestHeaders.setAccept(
                    List.of(MediaType.APPLICATION_JSON)
            );
            requestHeaders.set(
                    HttpHeaders.AUTHORIZATION,
                    "Token " + apiToken.trim()
            );

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(requestBody, requestHeaders);

            ResponseEntity<Map<String, Object>> cloudResponse =
                    restTemplate.exchange(
                            apiUrl,
                            HttpMethod.POST,
                            requestEntity,
                            new ParameterizedTypeReference<Map<String, Object>>() {
                            }
                    );

            Map<String, Object> responseBody =
                    cloudResponse.getBody();

            if (responseBody == null) {
                return createFailureResponse(
                        "Plate Recognizer không trả về dữ liệu."
                );
            }

            Object resultsObject =
                    responseBody.get("results");

            if (!(resultsObject instanceof List<?> results)
                    || results.isEmpty()) {
                return createFailureResponse(
                        "Không phát hiện được biển số trong ảnh."
                );
            }

            Map<?, ?> bestResult =
                    findBestResult(results);

            if (bestResult == null) {
                return createFailureResponse(
                        "Không tìm thấy kết quả biển số hợp lệ."
                );
            }

            String rawPlate =
                    readString(bestResult, "plate");

            double confidence =
                    readDouble(bestResult, "score");

            if (rawPlate.isBlank()) {
                return createFailureResponse(
                        "Plate Recognizer trả về biển số trống."
                );
            }

            String compactPlate =
                    cleanPlate(rawPlate);

            if (compactPlate.isBlank()) {
                return createFailureResponse(
                        "Kết quả biển số không hợp lệ."
                );
            }

            String apiVehicleType =
                    extractApiVehicleType(bestResult);

            String vehicleType =
                    resolveVehicleType(
                            requestedVehicleType,
                            apiVehicleType,
                            compactPlate
                    );

            String formattedPlate =
                    formatVietnamesePlate(
                            compactPlate,
                            vehicleType
                    );

            boolean lowConfidence =
                    confidence < minimumConfidence;

            String message;

            if (lowConfidence) {
                message =
                        "Đã nhận diện biển số nhưng độ tin cậy thấp. "
                                + "Vui lòng kiểm tra lại thủ công.";
            } else {
                message =
                        "Nhận diện biển số thành công.";
            }

            return PlateRecognitionResponse.builder()
                    .success(true)
                    .licensePlate(formattedPlate)
                    .vehicleType(vehicleType)
                    .confidence(confidence)
                    .message(message)
                    .build();

        } catch (HttpStatusCodeException exception) {
            return handleHttpError(exception);

        } catch (ResourceAccessException exception) {
            return createFailureResponse(
                    "Không thể kết nối tới Plate Recognizer. "
                            + "Vui lòng kiểm tra kết nối Internet."
            );

        } catch (Exception exception) {
            return createFailureResponse(
                    "Không thể nhận diện biển số: "
                            + exception.getMessage()
            );
        }
    }

    /**
     * Chuyển MultipartFile thành tài nguyên gửi lên Cloud API.
     */
    private ByteArrayResource createImageResource(
            MultipartFile image
    ) throws Exception {
        return new ByteArrayResource(image.getBytes()) {

            @Override
            public String getFilename() {
                String originalFilename =
                        image.getOriginalFilename();

                if (originalFilename == null
                        || originalFilename.isBlank()) {
                    return "plate-image.jpg";
                }

                return originalFilename;
            }
        };
    }

    /**
     * Tạo riêng HTTP entity cho phần ảnh.
     */
    private HttpEntity<ByteArrayResource> createImagePart(
            MultipartFile image,
            ByteArrayResource imageResource
    ) {
        HttpHeaders imageHeaders = new HttpHeaders();

        imageHeaders.setContentType(
                resolveImageMediaType(image.getContentType())
        );

        imageHeaders.setContentDispositionFormData(
                "upload",
                imageResource.getFilename()
        );

        return new HttpEntity<>(
                imageResource,
                imageHeaders
        );
    }

    /**
     * Xác định Content-Type của ảnh.
     */
    private MediaType resolveImageMediaType(
            String contentType
    ) {
        if (contentType == null || contentType.isBlank()) {
            return MediaType.IMAGE_JPEG;
        }

        try {
            return MediaType.parseMediaType(contentType);
        } catch (Exception ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    /**
     * Nếu trong ảnh có nhiều biển số,
     * chọn kết quả có confidence cao nhất.
     */
    private Map<?, ?> findBestResult(
            List<?> results
    ) {
        Map<?, ?> bestResult = null;
        double highestScore = -1.0;

        for (Object resultObject : results) {
            if (!(resultObject instanceof Map<?, ?> result)) {
                continue;
            }

            String plate =
                    readString(result, "plate");

            double score =
                    readDouble(result, "score");

            if (!plate.isBlank()
                    && score > highestScore) {
                highestScore = score;
                bestResult = result;
            }
        }

        return bestResult;
    }

    /**
     * Đọc loại xe từ:
     * results[].vehicle.type
     */
    private String extractApiVehicleType(
            Map<?, ?> result
    ) {
        Object vehicleObject =
                result.get("vehicle");

        if (!(vehicleObject instanceof Map<?, ?> vehicle)) {
            return "";
        }

        return readString(vehicle, "type");
    }

    /**
     * Chuyển kiểu xe của API thành kiểu xe của hệ thống.
     */
    private String resolveVehicleType(
            String requestedVehicleType,
            String apiVehicleType,
            String compactPlate
    ) {
        String requested =
                normalizeText(requestedVehicleType);

        if (isMotorbikeType(requested)) {
            return "Motorbike";
        }

        if (isCarType(requested)) {
            return "Car";
        }

        String apiType =
                normalizeText(apiVehicleType);

        if (isMotorbikeType(apiType)) {
            return "Motorbike";
        }

        if (isCarType(apiType)) {
            return "Car";
        }

        /*
         * Biển xe máy Việt Nam thường có:
         * 2 số tỉnh + 2 ký tự series + 5 số = 9 ký tự.
         *
         * Ví dụ: 12B116888.
         */
        if (compactPlate.length() == 9) {
            return "Motorbike";
        }

        /*
         * Biển ô tô thường có:
         * 2 số tỉnh + 1 chữ cái + 5 số = 8 ký tự.
         *
         * Ví dụ: 30A12893.
         */
        if (compactPlate.length() == 8) {
            return "Car";
        }

        return "";
    }

    private boolean isMotorbikeType(
            String value
    ) {
        return value.contains("motorcycle")
                || value.contains("motorbike")
                || value.contains("motor bike")
                || value.contains("motor")
                || value.contains("bike")
                || value.contains("xe may")
                || value.contains("moto");
    }

    private boolean isCarType(
            String value
    ) {
        return value.contains("car")
                || value.contains("sedan")
                || value.contains("suv")
                || value.contains("van")
                || value.contains("pickup")
                || value.contains("truck")
                || value.contains("bus")
                || value.contains("oto")
                || value.contains("automobile");
    }

    /**
     * Xóa khoảng trắng, dấu gạch và ký tự đặc biệt.
     *
     * Ví dụ:
     * 12-B1-168.88 -> 12B116888
     */
    private String cleanPlate(
            String rawPlate
    ) {
        if (rawPlate == null) {
            return "";
        }

        return rawPlate
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Định dạng biển số Việt Nam để hiển thị trên frontend.
     */
    private String formatVietnamesePlate(
            String compactPlate,
            String vehicleType
    ) {
        if (compactPlate == null
                || compactPlate.isBlank()) {
            return "";
        }

        /*
         * Xe máy:
         * 12B116888 -> 12-B1-168.88
         */
        if ("Motorbike".equalsIgnoreCase(vehicleType)
                && compactPlate.length() == 9) {
            return compactPlate.substring(0, 2)
                    + "-"
                    + compactPlate.substring(2, 4)
                    + "-"
                    + compactPlate.substring(4, 7)
                    + "."
                    + compactPlate.substring(7, 9);
        }

        /*
         * Ô tô:
         * 30A12893 -> 30A-128.93
         * 29D01245 -> 29D-012.45
         */
        if ("Car".equalsIgnoreCase(vehicleType)
                && compactPlate.length() == 8) {
            return compactPlate.substring(0, 3)
                    + "-"
                    + compactPlate.substring(3, 6)
                    + "."
                    + compactPlate.substring(6, 8);
        }

        /*
         * Nếu API không xác định rõ loại xe,
         * dựa vào số lượng ký tự để thử định dạng.
         */
        if (compactPlate.length() == 9) {
            return compactPlate.substring(0, 2)
                    + "-"
                    + compactPlate.substring(2, 4)
                    + "-"
                    + compactPlate.substring(4, 7)
                    + "."
                    + compactPlate.substring(7, 9);
        }

        if (compactPlate.length() == 8) {
            return compactPlate.substring(0, 3)
                    + "-"
                    + compactPlate.substring(3, 6)
                    + "."
                    + compactPlate.substring(6, 8);
        }

        /*
         * Trường hợp biển đặc biệt không theo hai mẫu trên,
         * giữ nguyên kết quả để nhân viên kiểm tra.
         */
        return compactPlate;
    }

    private String readString(
            Map<?, ?> map,
            String key
    ) {
        Object value = map.get(key);

        if (value == null) {
            return "";
        }

        return String.valueOf(value).trim();
    }

    private double readDouble(
            Map<?, ?> map,
            String key
    ) {
        Object value = map.get(key);

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        if (value != null) {
            try {
                return Double.parseDouble(
                        String.valueOf(value)
                );
            } catch (NumberFormatException ignored) {
                return 0.0;
            }
        }

        return 0.0;
    }

    private String normalizeText(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace("ô", "o")
                .replace("ơ", "o")
                .replace("ó", "o")
                .replace("ò", "o")
                .replace("ỏ", "o")
                .replace("õ", "o")
                .replace("ọ", "o")
                .replace("á", "a")
                .replace("à", "a")
                .replace("ả", "a")
                .replace("ã", "a")
                .replace("ạ", "a")
                .replace("ă", "a")
                .replace("â", "a")
                .replace("é", "e")
                .replace("è", "e")
                .replace("ẻ", "e")
                .replace("ẽ", "e")
                .replace("ẹ", "e")
                .replace("ê", "e")
                .replace("í", "i")
                .replace("ì", "i")
                .replace("ỉ", "i")
                .replace("ĩ", "i")
                .replace("ị", "i")
                .replace("ú", "u")
                .replace("ù", "u")
                .replace("ủ", "u")
                .replace("ũ", "u")
                .replace("ụ", "u")
                .replace("ư", "u")
                .replace("ý", "y")
                .replace("ỳ", "y")
                .replace("ỷ", "y")
                .replace("ỹ", "y")
                .replace("ỵ", "y")
                .replace("đ", "d");
    }

    /**
     * Xử lý lỗi HTTP do Plate Recognizer trả về.
     */
    private PlateRecognitionResponse handleHttpError(
            HttpStatusCodeException exception
    ) {
        int statusCode =
                exception.getStatusCode().value();

        if (statusCode == 403) {
            return createFailureResponse(
                    "API Token không hợp lệ hoặc tài khoản đã hết lượt nhận diện."
            );
        }

        if (statusCode == 413) {
            return createFailureResponse(
                    "Ảnh tải lên quá lớn. Vui lòng chọn ảnh có kích thước nhỏ hơn."
            );
        }

        if (statusCode == 429) {
            return createFailureResponse(
                    "Bạn đang quét quá nhanh. Vui lòng đợi ít nhất 1 giây rồi thử lại."
            );
        }

        return createFailureResponse(
                "Plate Recognizer trả về lỗi HTTP "
                        + statusCode
                        + "."
        );
    }

    private PlateRecognitionResponse createFailureResponse(
            String message
    ) {
        return PlateRecognitionResponse.builder()
                .success(false)
                .licensePlate("")
                .vehicleType("")
                .confidence(0.0)
                .message(message)
                .build();
    }
}