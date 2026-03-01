import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    accountName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Number, required: false },
    avatarColor: { type: String, required: false },
});

export default mongoose.model("User", userSchema);