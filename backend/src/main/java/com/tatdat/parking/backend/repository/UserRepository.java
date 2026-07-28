package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository
        extends JpaRepository<User, Integer> {

    /**
     * Tìm người dùng theo email.
     *
     * Được sử dụng cho:
     * - Đăng nhập
     * - Kiểm tra tài khoản hiện tại
     * - Xác định người nhận notification từ JWT
     */
    Optional<User> findByEmail(String email);

    /**
     * Tìm người dùng theo số điện thoại.
     */
    Optional<User> findByPhone(String phone);

    /**
     * Kiểm tra email đã tồn tại hay chưa.
     */
    boolean existsByEmail(String email);

    /**
     * Kiểm tra số điện thoại đã tồn tại hay chưa.
     */
    boolean existsByPhone(String phone);

    /**
     * Đếm số người dùng theo trạng thái.
     *
     * Ví dụ:
     * - ACTIVE
     * - INACTIVE
     * - BANNED
     */
    long countByStatus(String status);

    /**
     * Lấy toàn bộ tài khoản,
     * sắp xếp theo ID mới nhất trước.
     */
    List<User> findAllByOrderByIdDesc();

    /**
     * Lấy người dùng theo role.
     *
     * Ví dụ:
     * - SYSTEM_ADMIN
     * - PARKING_MANAGER
     * - PARKING_STAFF
     * - DRIVER
     */
    List<User> findByRole_RoleNameOrderByIdDesc(
            String roleName
    );

    /**
     * Lấy người dùng theo trạng thái.
     *
     * NotificationService sẽ dùng phương thức này
     * để gửi thông báo thay đổi giá cho tất cả
     * tài khoản đang hoạt động.
     */
    List<User> findByStatusOrderByIdDesc(
            String status
    );
}