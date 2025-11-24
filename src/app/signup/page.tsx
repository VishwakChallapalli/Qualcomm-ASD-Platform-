"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/styles/page3.module.css";

export default function SignupPage() {
    const [accountName, setAccountName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const router = useRouter();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();

        try {
            const res = await fetch("http://localhost:5001/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountName, email, password }),
            });

            const data = await res.json();
            setMessage(data.message);

            if (res.ok) {
                // Redirect to page4 after successful login
                router.push("/page4");
            }
        } catch (err) {
            console.error(err);
            setMessage("Network error");
        }
    }

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <div className={styles.header}>
                <h1 className={styles.title}>Create Your Account</h1>
                <p className={styles.subtitle}>Join us to begin your learning journey.</p>
            </div>

            {/* CONTENT */}
            <div className={styles.content}>
                <form
                    onSubmit={handleSignup}
                    className={styles.customizationSection}
                    style={{ maxWidth: "500px", margin: "0 auto" }}
                >
                    <h2 className={styles.sectionTitle}>Sign Up</h2>

                    {/* ACCOUNT NAME */}
                    <label className={styles.colorLabel}>Username</label>
                    <input
                        type="text"
                        required
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className={styles.navButton}
                        style={{
                            width: "100%",
                            marginBottom: "1.5rem",
                            textTransform: "none",
                            letterSpacing: "0",
                            background: "rgba(255,255,255,0.1)",
                        }}
                    />

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
                        Sign Up
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

                    {/* LOGIN REDIRECT */}
                    <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                        <p style={{ color: "white", opacity: 0.8 }}>Already have an account?</p>
                        <Link href="/login">
                            <button
                                className={styles.confirmButton}
                                style={{ marginTop: "0.5rem" }}
                            >
                                Log In
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
