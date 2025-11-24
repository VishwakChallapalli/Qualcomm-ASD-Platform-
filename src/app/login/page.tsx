"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/styles/page3.module.css";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:5001/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            setMessage(data.message);
        } catch (err) {
            console.error(err);
            setMessage("Network error");
        }
    }

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <div className={styles.header}>
                <h1 className={styles.title}>Welcome Back</h1>
                <p className={styles.subtitle}>Log in to continue your learning journey.</p>
            </div>

            {/* CONTENT */}
            <div className={styles.content}>
                <form
                    onSubmit={handleLogin}
                    className={styles.customizationSection}
                    style={{ maxWidth: "500px", margin: "0 auto" }}
                >
                    <h2 className={styles.sectionTitle}>Log In</h2>

                    {/* EMAIL */}
                    <label className={styles.colorLabel}>Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.navButton}
                        style={{
                            width: "100%",
                            marginBottom: "1.5rem",
                            textTransform: "none",
                            letterSpacing: "0",
                            background: "rgba(255,255,255,0.1)",
                        }}
                    />

                    {/* PASSWORD */}
                    <label className={styles.colorLabel}>Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.navButton}
                        style={{
                            width: "100%",
                            marginBottom: "1.5rem",
                            textTransform: "none",
                            letterSpacing: "0",
                            background: "rgba(255,255,255,0.1)",
                        }}
                    />

                    {/* SUBMIT BUTTON */}
                    <button
                        type="submit"
                        className={styles.confirmButton}
                        style={{ marginTop: "2rem" }}
                    >
                        Log In
                    </button>

                    {message && (
                        <p
                            style={{
                                color: "white",
                                textAlign: "center",
                                marginTop: "1rem",
                                opacity: 0.9,
                            }}
                        >
                            {message}
                        </p>
                    )}

                    {/* SIGNUP REDIRECT */}
                    <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                        <p style={{ color: "white", opacity: 0.8 }}>Don't have an account?</p>
                        <Link href="/signup">
                            <button
                                className={styles.confirmButton}
                                style={{ marginTop: "0.5rem" }}
                            >
                                Sign Up
                            </button>
                        </Link>
                    </div>
                </form>
            </div>

            {/* NAVIGATION */}
            <div className={styles.navBar}>
                <Link href="/" className={styles.navButton}>
                    ← Home
                </Link>
            </div>
        </div>
    );
}
