import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();
const app = express();

// need to change to only acceptable source later
app.use(cors());
app.use(express.json());

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

        res.json({ message: "Login successful", accountName: user.accountName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));