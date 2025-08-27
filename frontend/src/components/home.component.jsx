import React, { useState, useEffect } from "react";
import UserService from "../services/user.service";

export default function Home() {
    const [content, setContent] = useState("");

    useEffect(() => {
        UserService.getPublicContent().then(
            (response) => {
                setContent(response.data);
            },
            (error) => {
                const errorMsg =
                    (error.response && error.response.data) ||
                    error.message ||
                    error.toString();
                setContent(errorMsg);
            }
        );
    }, []);

    return (
        <div className="home-container">
            <div className="home-hero">
                <h1 className="home-title">Welcome to CodeFast</h1>
                <p className="home-subtitle">
                    A platform to practice coding and compete in challenges.
                </p>
                <div className="home-content">
                    {content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                    ))}
                </div>

            </div>
        </div>
    );
}