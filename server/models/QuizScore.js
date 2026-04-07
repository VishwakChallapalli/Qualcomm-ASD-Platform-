import mongoose from "mongoose";

const quizScoreSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    displayName: { type: String, default: "User" },
    points: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
});

// Index for leaderboard queries
quizScoreSchema.index({ points: -1, updatedAt: -1 });

export default mongoose.model("QuizScore", quizScoreSchema);
