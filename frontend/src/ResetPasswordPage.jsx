import React, { useState } from "react";
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosClient from "./api/axiosClient";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState = location.state?.email || "";

  const [formData, setFormData] = useState({
    email: emailFromState,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const validation = {
    hasUpper: /[A-Z]/.test(formData.newPassword),
    hasNumber: /[0-9]/.test(formData.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
    isMinLength: formData.newPassword.length >= 8,
  };

  const isPasswordValid = Object.values(validation).every(Boolean);

  const showToast = (message, type = "success") => {
    setNotification({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setNotification((prev) => ({
        ...prev,
        show: false,
      }));
    }, 4000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      showToast("Email is required.", "error");
      return;
    }

    if (!formData.otp.trim()) {
      showToast("OTP is required.", "error");
      return;
    }

    if (!isPasswordValid) {
      showToast("Please meet all password requirements first.", "error");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setIsLoading(true);

    try {
      await axiosClient.post("/auth/reset-password", {
        email: formData.email.trim().toLowerCase(),
        otp: formData.otp.trim(),
        newPassword: formData.newPassword,
      });

      showToast("Password reset successfully. Redirecting to login...", "success");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data ||
          "Reset password failed.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ position: "relative" }}>
      {notification.show && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor:
              notification.type === "success" ? "#1e293b" : "#451a1a",
            color: notification.type === "success" ? "#4ade80" : "#f87171",
            border:
              notification.type === "success"
                ? "1px solid #22c55e"
                : "1px solid #ef4444",
            padding: "1rem 2rem",
            borderRadius: "0.5rem",
            zIndex: 9999,
            fontWeight: "600",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                notification.type === "success" ? "#22c55e" : "#ef4444",
            }}
          />
          {notification.message}
        </div>
      )}

      <div className="login-column">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              backgroundColor: "#3b82f6",
              padding: "0.4rem",
              borderRadius: "0.375rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: "800",
                fontSize: "0.9rem",
                color: "#fff",
              }}
            >
              P
            </span>
          </div>

          <span
            style={{
              fontWeight: "600",
              fontSize: "0.95rem",
              color: "#f8fafc",
            }}
          >
            ParkSystem Pro
          </span>
        </div>

        <div style={{ margin: "auto 0", maxWidth: "400px", width: "100%" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
              color: "#ffffff",
            }}
          >
            Reset Password
          </h1>

          <p
            style={{
              color: "#64748b",
              fontSize: "0.9rem",
              lineHeight: "1.5",
              marginBottom: "2rem",
            }}
          >
            Enter the OTP sent to your email and create a new password.
          </p>

          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label className="input-label">YOUR EMAIL</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon-left" />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="user@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">OTP CODE</label>
              <div className="input-wrapper">
                <KeyRound size={16} className="input-icon-left" />
                <input
                  type="text"
                  name="otp"
                  className="form-input"
                  placeholder="Enter OTP code"
                  value={formData.otp}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "0.5rem" }}>
              <label className="input-label">NEW PASSWORD</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.75rem",
                  color: validation.hasUpper ? "#22c55e" : "#94a3b8",
                }}
              >
                {validation.hasUpper ? (
                  <Check size={12} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 uppercase letter</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.75rem",
                  color: validation.hasSpecial ? "#22c55e" : "#94a3b8",
                }}
              >
                {validation.hasSpecial ? (
                  <Check size={12} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 special character</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.75rem",
                  color: validation.hasNumber ? "#22c55e" : "#94a3b8",
                }}
              >
                {validation.hasNumber ? (
                  <Check size={12} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 number</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.75rem",
                  color: validation.isMinLength ? "#22c55e" : "#94a3b8",
                }}
              >
                {validation.isMinLength ? (
                  <Check size={12} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>Minimum 8 characters</span>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "1.5rem" }}>
              <label className="input-label">CONFIRM NEW PASSWORD</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.85rem",
                backgroundColor: isLoading ? "#1e3a8a" : "#3b82f6",
                color: isLoading ? "#93c5fd" : "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                fontWeight: "600",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                marginBottom: "1.5rem",
              }}
            >
              {isLoading ? "Resetting..." : "Confirm Reset Password"}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ textAlign: "center" }}>
            <span
              onClick={() => navigate("/")}
              style={{
                color: "#64748b",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Sign In
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            maxWidth: "360px",
            marginTop: "1.5rem",
          }}
        >
          <ShieldCheck size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
          <p
            style={{
              fontSize: "0.72rem",
              color: "#64748b",
              lineHeight: "1.4",
              margin: 0,
            }}
          >
            Protected System. Unauthorized access attempts will be logged.
          </p>
        </div>
      </div>

      <div className="showcase-column anh-dong">
        <div className="dashboard-perspective-wrapper">
          <img
            src={new URL("./Pictures/carparking.png", import.meta.url).href}
            alt="Infrastructure Preview"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "0.75rem",
              boxShadow: "-20px 30px 60px rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;