package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByFullName(String fullName);

    long countByStatus(String status);
}