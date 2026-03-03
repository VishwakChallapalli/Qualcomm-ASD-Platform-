import mongoose from "mongoose";

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
        },
        mathGame: {
            timePlayed: { type: Number, default: 0 },
            wins:       { type: Number, default: 0 },
            score:      { type: Number, default: 0 },
            level:      { type: Number, default: 1 },
        },
        mirrorEmotions: {
            timePlayed: { type: Number, default: 0 },
            wins:       { type: Number, default: 0 },
            score:      { type: Number, default: 0 },
        },
    },
});

export default mongoose.model("User", userSchema);
