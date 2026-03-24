import mongoose from "mongoose";

const emotionTimeSchema = {
    happy:     { type: Number, default: 0 },
    sad:       { type: Number, default: 0 },
    angry:     { type: Number, default: 0 },
    surprised: { type: Number, default: 0 },
    fearful:   { type: Number, default: 0 },
    disgusted: { type: Number, default: 0 },
    neutral:   { type: Number, default: 0 },
};

const userSchema = new mongoose.Schema({
    accountName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Number, required: false },
    avatarColor: { type: String, required: false },
    gameProgress: {
        ticTacToe: {
            timePlayed:   { type: Number, default: 0 },
            wins:         { type: Number, default: 0 },
            computerWins: { type: Number, default: 0 },
            ties:         { type: Number, default: 0 },
            score:        { type: Number, default: 0 },
            emotionTime:  emotionTimeSchema,
        },
        mathGame: {
            timePlayed:  { type: Number, default: 0 },
            wins:        { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            level:       { type: Number, default: 1 },
            emotionTime: emotionTimeSchema,
        },
        mirrorEmotions: {
            timePlayed:  { type: Number, default: 0 },
            wins:        { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
        },
        colorPattern: {
            timePlayed:  { type: Number, default: 0 },
            wins:        { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            level:       { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
        },
        neonRhythm: {
            timePlayed:  { type: Number, default: 0 },
            wins:        { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
        },
        astralJump: {
            timePlayed:  { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
        },
        whatWouldYouDo: {
            timePlayed:  { type: Number, default: 0 },
            wins:        { type: Number, default: 0 },
            score:       { type: Number, default: 0 },
            emotionTime: emotionTimeSchema,
        },
    },
});

export default mongoose.model("User", userSchema);
