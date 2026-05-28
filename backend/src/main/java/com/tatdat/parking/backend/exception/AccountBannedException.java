package com.tatdat.parking.backend.exception;

public class AccountBannedException extends RuntimeException {

    public AccountBannedException(String message) {
        super(message);
    }
}