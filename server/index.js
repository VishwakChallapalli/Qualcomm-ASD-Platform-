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

app.post("/logout", (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });
    res.json({ message: "Logged out" });
});

app.put("/updateProfile", async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ message: "Not logged in" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentAccountName = decoded.accountName;
        const user = await User.findOne({ accountName: currentAccountName });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { accountName, avatarId, avatarColor } = req.body;

        // Check if new username is taken by someone else
        if (accountName && accountName !== currentAccountName) {
            const existing = await User.findOne({ accountName });
            if (existing) {
                return res.status(400).json({ message: "That username is already taken" });
            }
            user.accountName = accountName;
        }

        if (avatarId !== undefined) user.avatarId = avatarId;
        if (avatarColor !== undefined) user.avatarColor = avatarColor;

        await user.save();

        // Reissue token with updated accountName
        const newToken = jwt.sign(
            { accountName: user.accountName, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "60 min" }
        );

        res.cookie("accessToken", newToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60 * 60 * 1000
        });

        res.json({ message: "Profile updated", user });
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
});

// ── Game Progress ──────────────────────────────────────────────────────────────

app.get("/progress", async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ accountName: decoded.accountName }).lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const defaultEmotionTime = { happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0, neutral: 0 };
        const defaultGame = (overrides = {}) => ({
            timePlayed: 0, wins: 0, score: 0, emotionTime: { ...defaultEmotionTime }, ...overrides,
        });

        const gp = user.gameProgress || {};
        const mergeGame = (saved) => {
            if (!saved) return defaultGame();
            return {
                ...defaultGame(),
                ...saved,
                emotionTime: { ...defaultEmotionTime, ...(saved.emotionTime || {}) },
                sessions: (saved.sessions || []).slice(-20),
            };
        };

        res.json({
            ticTacToe: mergeGame(gp.ticTacToe),
            mathGame: mergeGame(gp.mathGame),
            mirrorEmotions: mergeGame(gp.mirrorEmotions),
            colorPattern: mergeGame(gp.colorPattern),
            neonRhythm: mergeGame(gp.neonRhythm),
            astralJump: mergeGame(gp.astralJump),
            whatWouldYouDo: mergeGame(gp.whatWouldYouDo),
            storyReader: mergeGame(gp.storyReader),
        });
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
});

// Accepts: { game, addTimePlayed?, addWins?, setScore?, addScore?, addComputerWins?, addTies?, setLevel?, addEmotionTime? }
app.put("/updateProgress", async (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ accountName: decoded.accountName });
        if (!user) return res.status(404).json({ message: "User not found" });

        const { game, addTimePlayed, addWins, setScore, addScore, addComputerWins, addTies, setLevel, addEmotionTime } = req.body;

        if (!user.gameProgress) user.gameProgress = {};
        if (!user.gameProgress[game]) user.gameProgress[game] = {};

        const g = user.gameProgress[game];

        if (addTimePlayed) g.timePlayed = (g.timePlayed || 0) + addTimePlayed;
        if (addWins) g.wins = (g.wins || 0) + addWins;
        if (addComputerWins) g.computerWins = (g.computerWins || 0) + addComputerWins;
        if (addTies) g.ties = (g.ties || 0) + addTies;
        if (setScore !== undefined && setScore > (g.score || 0)) g.score = setScore;
        if (addScore) g.score = (g.score || 0) + addScore; // additive (e.g. stories completed)
        if (setLevel !== undefined && setLevel > (g.level || 0)) g.level = setLevel;

        if (addEmotionTime && typeof addEmotionTime === "object") {
            // DeepFace returns "surprise", "fear", "disgust" — normalize to schema keys
            const EMOTION_KEY_MAP = { surprise: "surprised", fear: "fearful", disgust: "disgusted" };
            const normalized = Object.fromEntries(
                Object.entries(addEmotionTime).map(([k, v]) => [EMOTION_KEY_MAP[k] || k, v])
            );

            if (!g.emotionTime) g.emotionTime = {};
            for (const [emotion, seconds] of Object.entries(normalized)) {
                if (typeof seconds === "number" && seconds > 0) {
                    g.emotionTime[emotion] = (g.emotionTime[emotion] || 0) + seconds;
                }
            }
            // Record this session individually for trend graphs
            if (!g.sessions) g.sessions = [];
            g.sessions.push({
                date: new Date(),
                timePlayed: addTimePlayed || 0,
                emotionTime: { ...normalized },
            });
            // Keep only the last 20 sessions to cap document size
            if (g.sessions.length > 20) g.sessions = g.sessions.slice(-20);
        }

        user.markModified("gameProgress");
        await user.save();

        res.json({ message: "Progress updated", gameProgress: user.gameProgress });
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));