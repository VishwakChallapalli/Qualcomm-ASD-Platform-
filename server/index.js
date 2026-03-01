import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// route to handle signup
app.post("/signup", async (req, res) => {
    console.log('POST /signup received', req.body); // Debug log

    try {
        const { accountName, email, password } = req.body;

        const existingEmail = await User.findOne({ email });
        const existingAccount = await User.findOne({ accountName })
        if (existingEmail)
            return res.status(400).json({ message: "An account associated with this email already exists" });
        if (existingAccount)
            return res.status(400).json({ message: "This user name already exists" })

        const newUser = new User({ accountName, email, password });
        await newUser.save();

        const token = jwt.sign(
            { accountName: accountName, email: email },
            process.env.JWT_SECRET,
            { expiresIn: "60 min" }
        )

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60 * 60 * 1000
        });

        res.status(201).json({ message: "User created successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.password !== password) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        const token = jwt.sign(
            { accountName: user.accountName, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "60 min" }
        )

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60 * 60 * 1000
        });

        res.json({ message: "Login successful", accountName: user.accountName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/me", async (req, res) => {
    const token = req.cookies.accessToken
    if (!token) {
        return res.status(401).json({ message: "Not logged in" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        const accountName = req.user.accountName;
        const user = await User.findOne({ accountName });
        res.json(user);
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }

});

app.put("/setAvatar", async (req, res) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ message: "Not logged in" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded
        const accountName = req.user.accountName;
        const user = await User.findOne({ accountName });
        const { selectedAvatar, selectedColor } = req.body;

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        user.avatarId = selectedAvatar;
        user.avatarColor = selectedColor;
        await user.save();
        res.json({ message: "Avatar Set", user });

    } catch {
        return res.status(401).json({ message: "Invalid token" })
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));