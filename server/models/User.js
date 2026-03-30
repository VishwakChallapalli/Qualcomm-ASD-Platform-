import mongoose from "mongoose";

const emotionTimeSchema = {
    happy: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    angry: { type: Number, default: 0 },
    surprised: { type: Number, default: 0 },
    fearful: { type: Number, default: 0 },
    disgusted: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
};

const sessionSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    timePlayed: { type: Number, default: 0 },
    emotionTime: emotionTimeSchema,
}, { _id: false });

const userSchema = new mongoose.Schema({
    accountName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Number, required: false },
    avatarColor: { type: String, required: false },
    gameProgress: {
        ticTacToe: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            computerWins: { type: Number, default: 0 },
            ties: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        mathGame: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        mirrorEmotions: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        colorPattern: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            level: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        neonRhythm: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        astralJump: {
            timePlayed: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        whatWouldYouDo: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            score: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
        storyReader: {
            timePlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 }, // total words read correctly
            score: { type: Number, default: 0 }, // total stories completed
            storiesCompleted: { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
            sessions: [sessionSchema],
        },
    },
});

export default mongoose.model("User", userSchema);
