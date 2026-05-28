package com.tatdat.parking.backend.dto;



import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Integer id;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private String roleName;
}
