import React from "react";
import { Link } from "react-router-dom";

function Navbar({ currentUser, showAdminBoard, logOut }) {
    return (
        <header className="navbar">
            <Link to="/" className="logo">CodeFast</Link>

            <nav className="nav-links">
                <Link to="/home">Home</Link>
                {currentUser && (
                    <>
                        <Link to="/problems">Problems</Link>
                        <Link to="/profile">Profile</Link>
                    </>
                )}
                {showAdminBoard && <Link to="/admin">Admin</Link>}
            </nav>

            <div className="auth-links">
                {currentUser ? (
                    <>
                        <span className="username">{currentUser.username}</span>
                        <button className="logout-btn" onClick={logOut}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="login-btn">Login</Link>
                        <Link to="/register" className="signup-btn">Sign Up</Link>
                    </>
                )}
            </div>
        </header>
    );
}

export default Navbar;
