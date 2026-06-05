import React, { useState } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  AlertTriangle,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosClient from "./api/axiosClient";

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState("");

  const navigate = useNavigate();

  const POPULAR_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "fpt.edu.vn",
  ];

  const getLevenshteinDistance = (a, b) => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  const checkEmailTypo = (inputEmail) => {
    if (!inputEmail || !inputEmail.includes("@")) return "";

    const [local, domain] = inputEmail.split("@");

    if (!domain) return "";

    for (const targetDomain of POPULAR_DOMAINS) {
      if (domain === targetDomain) return "";

      const distance = getLevenshteinDistance(
        domain.toLowerCase(),
        targetDomain
      );

      if (distance <= 2) {
        return `${local}@${targetDomain}`;
      }
    }

    return "";
  };

  const validation = {
    hasUpper: /[A-Z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
    isMinLength: formData.password.length >= 8,
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

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "email") {
        setEmailSuggestion(checkEmailTypo(value));
      }

      return updated;
    });
  };

  const applySuggestion = () => {
    if (emailSuggestion) {
      setFormData((prev) => ({
        ...prev,
        email: emailSuggestion,
      }));

      setEmailSuggestion("");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[0-9]{9,11}$/;

    if (!formData.fullName.trim()) {
      showToast("Full name is required.", "error");
      return;
    }

    if (!emailRegex.test(formData.email.trim())) {
      showToast("Registration failed. Invalid email format!", "error");
      return;
    }

    if (!formData.phone.trim()) {
      showToast("Phone number is required.", "error");
      return;
    }

    if (!phoneRegex.test(formData.phone.trim())) {
      showToast("Phone number must contain 9 to 11 digits.", "error");
      return;
    }

    if (!isPasswordValid) {
      showToast("Please meet all password requirements first!", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Registration failed. Passwords do not match!", "error");
      return;
    }

    setIsLoading(true);

    try {
      await axiosClient.post("/auth/register", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      showToast("Registration successful! Redirecting to login...", "success");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          err.response?.data ||
          "Registration failed. Please try again.",
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
            <span style={{ fontWeight: "800", fontSize: "0.9rem", color: "#fff" }}>
              P
            </span>
          </div>

          <span style={{ fontWeight: "600", fontSize: "0.95rem", color: "#f8fafc" }}>
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
            Create Account
          </h1>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              padding: "0.75rem",
              borderRadius: "0.375rem",
              marginBottom: "1.5rem",
              color: "#fbbf24",
              fontSize: "0.78rem",
              lineHeight: "1.4",
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              <strong>Notice:</strong> Please provide accurate information to
              create your parking account.
            </span>
          </div>

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label className="input-label">FULL NAME</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon-left" />
                <input
                  type="text"
                  name="fullName"
                  className="form-input"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div
              className="input-group"
              style={{ marginBottom: emailSuggestion ? "0.25rem" : "1rem" }}
            >
              <label className="input-label">EMAIL</label>
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

            {emailSuggestion && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "0.375rem",
                  marginBottom: "1rem",
                  fontSize: "0.78rem",
                  color: "#93c5fd",
                }}
              >
                <Sparkles size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
                <span>
                  Did you mean{" "}
                  <strong
                    onClick={applySuggestion}
                    style={{
                      color: "#3b82f6",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    {emailSuggestion}
                  </strong>
                  ?
                </span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">PHONE NUMBER</label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon-left" />
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  placeholder="0901234567"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "0.5rem" }}>
              <label className="input-label">PASSWORD</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
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
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Password Rules:
              </span>

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
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 uppercase letter (A-Z)</span>
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
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 special character (!@#$%^&*)</span>
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
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>At least 1 number (0-9)</span>
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
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <X size={12} style={{ color: "#ef4444" }} />
                )}
                <span>Minimum 8 characters length</span>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "1.5rem" }}>
              <label className="input-label">CONFIRM PASSWORD</label>
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
                transition: "all 0.2s",
                marginBottom: "1.5rem",
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#2563eb";
              }}
              onMouseOut={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#3b82f6";
              }}
            >
              {isLoading ? "Processing Request..." : "Create Account"}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "center" }}>
            Already have an account?{" "}
            <span
              onClick={() => navigate("/")}
              style={{
                color: "#3b82f6",
                cursor: "pointer",
                fontWeight: "600",
                textDecoration: "underline",
              }}
            >
              Log in
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
            System protected by 256-bit SSL encryption. Data processing
            compliant with regional safety standards.
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

        <div style={{ textAlign: "center", maxWidth: "440px", marginTop: "1rem" }}>
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: "#ffffff",
            }}
          >
            Real-time Infrastructure Control
          </h3>

          <p style={{ color: "#475569", fontSize: "0.82rem", lineHeight: "1.5" }}>
            Monitor floor occupancy, manage dynamic pricing, and automate gate
            access from a single source of truth.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;