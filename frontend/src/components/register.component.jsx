import React from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { register as registerAction } from "../actions/auth";

export default function Register() {
    const dispatch = useDispatch();
    const { message } = useSelector((state) => state.message);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isSubmitSuccessful },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            await dispatch(registerAction(data.username, data.email, data.password));
        } catch (err) {
            console.error("Register failed:", err);
        }
    };

    return (
        <div className="auth-container">
            <div className="card">
                <h2>Create an Account</h2>
                <p className="subtitle">Join CodeFast and start coding</p>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Username */}
                    <label>Username</label>
                    <input
                        type="text"
                        {...register("username", {
                            required: "Username is required",
                            minLength: { value: 3, message: "Minimum 3 characters" },
                            maxLength: { value: 20, message: "Maximum 20 characters" },
                        })}
                        placeholder="Enter your username"
                    />
                    {errors.username && <span className="error">{errors.username.message}</span>}

                    {/* Email */}
                    <label>Email</label>
                    <input
                        type="text"
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[^@ ]+@[^@ ]+\.[^@ .]{2,}$/,
                                message: "Invalid email address",
                            },
                        })}
                        placeholder="Enter your email"
                    />
                    {errors.email && <span className="error">{errors.email.message}</span>}

                    {/* Password */}
                    <label>Password</label>
                    <input
                        type="password"
                        {...register("password", {
                            required: "Password is required",
                            minLength: { value: 6, message: "Minimum 6 characters" },
                            maxLength: { value: 40, message: "Maximum 40 characters" },
                        })}
                        placeholder="Enter your password"
                    />
                    {errors.password && <span className="error">{errors.password.message}</span>}

                    {/* Submit */}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Signing Up..." : "Sign Up"}
                    </button>
                </form>

                {/* Message */}
                {message && (
                    <div className={`alert ${isSubmitSuccessful ? "success" : "danger"}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}