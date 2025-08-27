import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";

// pages
import Home from "./components/home.component";
import Login from "./components/login.component";
import Register from "./components/register.component";
import Profile from "./components/profile.component";
import Problems from "./components/problems.component";
import Compiler from "./components/compiler.component";
import AdminPanel from "./components/adminpanel.component";
import ManageTestcases from "./components/managetestcases.component";
import Navbar from "./components/navbar";

import { logout } from "./actions/auth";
import { clearMessage } from "./actions/message";

// wrapper for auth
function RequireAuth({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user: currentUser } = useSelector((state) => state.auth);
  const [showAdminBoard, setShowAdminBoard] = useState(false);

  useEffect(() => {
    dispatch(clearMessage());
    if (currentUser?.roles) {
      setShowAdminBoard(currentUser.roles.includes("ROLE_ADMIN"));
    } else {
      setShowAdminBoard(false);
    }
  }, [currentUser, dispatch]);

  const logOut = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div>
      {/* Navbar component */}
      <Navbar
        currentUser={currentUser}
        showAdminBoard={showAdminBoard}
        logOut={logOut}
      />

      {/* Routes */}
      <main className="container">
        <Routes>
          {/* public */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* protected (user-only) */}
          <Route
            path="/problems"
            element={
              <RequireAuth user={currentUser}>
                <Problems />
              </RequireAuth>
            }
          />
          <Route
            path="/problems/:id"
            element={
              <RequireAuth user={currentUser}>
                <Compiler />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth user={currentUser}>
                <Profile />
              </RequireAuth>
            }
          />

          {/* admin-only */}
          <Route
            path="/admin"
            element={
              <RequireAuth user={showAdminBoard ? currentUser : null}>
                <AdminPanel />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/problems/:problemId/testcases"
            element={
              <RequireAuth user={showAdminBoard ? currentUser : null}>
                <ManageTestcases />
              </RequireAuth>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}