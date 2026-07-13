package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckInRequest {

    private String licensePlate;

    private Integer vehicleTypeId;

    /*
     * Không bắt buộc nữa.
     *
     * Luồng mới:
     * - Nếu xe có booking CONFIRMED:
     *      backend tự dùng slot đã booking.
     *
     * - Nếu xe vãng lai:
     *      backend tự tìm slot AVAILABLE theo vehicleTypeId.
     *
     * Giữ floorId lại để không làm vỡ code cũ,
     * nhưng ParkingOperationController mới sẽ không cần field này nữa.
     */
    private Integer floorId;
}