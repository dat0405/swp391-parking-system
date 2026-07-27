package com.tatdat.parking.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
@Schema(
        description = "Dữ liệu dùng để thay đổi role của người dùng"
)
public class UpdateUserRoleRequest {

    @NotNull(
            message = "Role is required"
    )
    @Min(
            value = 1,
            message = "Role ID must be between 1 and 4"
    )
    @Max(
            value = 4,
            message = "Role ID must be between 1 and 4"
    )
    @Schema(
            example = "3",
            description = """
                    ID role mới:
                    1 = SYSTEM_ADMIN
                    2 = PARKING_MANAGER
                    3 = PARKING_STAFF
                    4 = DRIVER

                    DRIVER cũng chính là người dùng thông thường
                    của hệ thống.
                    """
    )
    private Integer roleId;
}