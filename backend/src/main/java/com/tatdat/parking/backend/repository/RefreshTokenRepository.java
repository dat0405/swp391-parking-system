package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.RefreshToken;
import com.tatdat.parking.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Integer> {

    Optional<RefreshToken> findByToken(String token);

    void deleteByUser(User user);
}