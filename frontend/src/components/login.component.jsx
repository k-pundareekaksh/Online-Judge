import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { login } from "../actions/auth";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoggedIn, message } = useSelector((state) => ({
    isLoggedIn: state.auth.isLoggedIn,
    message: state.message.message,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return;

    setLoading(true);
    try {
      await dispatch(login(form.username, form.password));
      navigate("/profile");
    } catch {
      setLoading(false);
    }
  };

  if (isLoggedIn) return <Navigate to="/profile" />;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        {message && <div className="auth-alert">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Enter your username"
          />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter your password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}