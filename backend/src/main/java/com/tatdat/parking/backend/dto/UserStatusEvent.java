package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatusEvent {

    private Integer userId;

    private String status;

    private boolean online;

    private LocalDateTime lastLoginAt;

    private LocalDateTime lastActiveAt;

    private LocalDateTime updatedAt;
}