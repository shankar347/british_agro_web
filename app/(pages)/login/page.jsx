"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import "../../styles/pages/login.css";
import Image from "next/image";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function LoginPage() {
  const [name, setName] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    // Pass name instead of email
    const ok = await login(name, password);
    
    setSubmitting(false);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid name or password. Please try again.");
    }
  };

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <Image
            src="/assests/images/logo.png"
            alt="BritishAgro Logo"
            width={40}
            height={40}
            className="login-logo-image"
            priority
          />
          <div className="login-logo">BRITISHAGRO</div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label" htmlFor="name">
              USER NAME
            </label>
            <input
              id="name"
              type="text"
              className="login-input"
              placeholder="Enter your username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="login-form-group password-group">
            <label className="login-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span 
              className="password-toggle-icon" 
              onClick={togglePassword} 
              role="button" 
              aria-label="Toggle password visibility"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </span>
          </div>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "Signing in…" : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}