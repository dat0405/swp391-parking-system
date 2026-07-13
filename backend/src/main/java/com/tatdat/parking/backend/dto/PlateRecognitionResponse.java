package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlateRecognitionResponse {

    private Boolean success;

    // Biển số đã được định dạng.
    // Ví dụ: 30A-128.93 hoặc 59-V1-793.79
    private String licensePlate;

    // Giữ tương thích với frontend nếu frontend đọc response.plate
    private String plate;

    // Car hoặc Motorbike
    private String vehicleType;

    // Độ tin cậy từ 0.0 đến 1.0
    private Double confidence;

    // true khi kết quả cần nhân viên kiểm tra lại
    private Boolean needsReview;

    // Nguồn nhận diện
    private String provider;

    private String message;
}