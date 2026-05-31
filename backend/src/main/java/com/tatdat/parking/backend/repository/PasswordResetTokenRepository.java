package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.PasswordResetToken;
import com.tatdat.parking.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    List<PasswordResetToken> findByUserAndUsedFalseOrderByCreatedAtDesc(User user);
}