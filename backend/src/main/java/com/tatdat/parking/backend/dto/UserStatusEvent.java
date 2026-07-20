package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatusEvent {

    private Integer userId;

    private String status;

    private boolean online;

    /*
     * Thời điểm đăng nhập gần nhất.
     * Instant giúp backend trả JSON có timezone UTC rõ ràng,
     * ví dụ: 2026-07-20T09:04:00Z
     */
    private Instant lastLoginAt;

    /*
     * Thời điểm hoạt động gần nhất của người dùng.
     */
    private Instant lastActiveAt;

    /*
     * Thời điểm thông tin người dùng được cập nhật gần nhất.
     */
    private Instant updatedAt;
}