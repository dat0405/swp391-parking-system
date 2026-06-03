CREATE TABLE password_reset_tokens (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expiry_date DATETIME2 NOT NULL,
    used BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    used_at DATETIME2 NULL,

    CONSTRAINT fk_password_reset_tokens_users
        FOREIGN KEY (user_id) REFERENCES users(id)
);