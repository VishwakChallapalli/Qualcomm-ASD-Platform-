import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import QuizScore from "./models/QuizScore.js";
import { QUIZ_SYSTEM_PROMPT } from "./quizPrompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
const app = express();

// In dev, allow bypassing auth so the app can be demoed without login/signup.
// Set AUTH_BYPASS=false to force auth in dev, or AUTH_BYPASS=true in prod if needed (not recommended).
// Default false so the app uses real login/signup. Set AUTH_BYPASS=true in .env for demo-only guest mode.
const AUTH_BYPASS = String(process.env.AUTH_BYPASS ?? "false").toLowerCase() === "true";

function guestUser() {
    return {
        accountName: "Guest",
        email: "guest@local",
        avatarId: 1,
        avatarColor: "#4a90e2",
    };
}

async function getOrCreateGuestUserBySession(sessionId) {
    if (!sessionId) return null;
    if (mongoose.connection.readyState !== 1) return null;

    const sid = String(sessionId).trim();
    if (!sid) return null;

    const safe = sid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "anon";
    const accountName = `guest-${safe}`;
    const email = `guest-${safe}@local`;
    const password = "guest";

    let user = await User.findOne({ accountName });
    if (!user) {
        user = new User({ accountName, email, password, avatarId: 1, avatarColor: "#4a90e2" });
        await user.save();
    }
    if (!user.gameProgress) user.gameProgress = {};
    return user;
}

async function getUserForRequest(req, { sessionIdFallback } = {}) {
    const token = req.cookies?.accessToken;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const accountName = decoded.accountName;
            const user = await User.findOne({ accountName });
            if (user) return user;
        } catch {
            // ignore; may fall back to guest mode
        }
    }

    if (AUTH_BYPASS) {
        const sid =
            req.get("x-session-id") ||
            req.query?.sessionId ||
            sessionIdFallback ||
            "";
        const guest = await getOrCreateGuestUserBySession(sid);
        if (guest) return guest;
    }

    return null;
}

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
    const user = await getUserForRequest(req);
    if (user) return res.json(user);
    if (AUTH_BYPASS) return res.json(guestUser());
    return res.status(401).json({ message: "Not logged in" });

});

app.put("/setAvatar", async (req, res) => {
    const token = req.cookies.accessToken;

    if (!token) {
        if (AUTH_BYPASS) return res.json({ message: "Guest mode: avatar not persisted." });
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
        if (AUTH_BYPASS) return res.json({ message: "Guest mode: profile not persisted.", user: guestUser() });
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

// ── Social Skills Quiz (LM Studio) ──────────────────────────────────────────────
// Public endpoints (no auth cookie required)

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:1234/v1";
const LLM_MODEL = process.env.LLM_MODEL || "llama-3.2-1b-instruct";
const LLM_API_KEY = process.env.LLM_API_KEY || ""; // typically empty for LM Studio localhost
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS, 10) || 120000;
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS, 10) || 220;
const LLM_TEMPERATURE = process.env.LLM_TEMPERATURE ? Number(process.env.LLM_TEMPERATURE) : 0.4;
const LLM_HISTORY_LIMIT = parseInt(process.env.LLM_HISTORY_LIMIT, 10) || 6;

function joinUrl(base, path) {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

async function callLmStudioChat({ messages, maxTokensOverride }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const headers = {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
    };

    const res = await fetch(joinUrl(LLM_BASE_URL, "/chat/completions"), {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: LLM_MODEL,
            messages,
            temperature: Number.isFinite(LLM_TEMPERATURE) ? LLM_TEMPERATURE : 0.4,
            max_tokens: typeof maxTokensOverride === "number" ? maxTokensOverride : LLM_MAX_TOKENS,
            stream: false,
        }),
        signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LM Studio request failed: ${res.status} ${errText}`);
    }

    return await res.json();
}

function looksLikeCompleteQuestion(text) {
    const t = String(text || "");
    return (
        /Scenario:\s*/i.test(t) &&
        /Question:\s*/i.test(t) &&
        /(^|\n)\s*A\)\s+/m.test(t) &&
        /(^|\n)\s*B\)\s+/m.test(t) &&
        /(^|\n)\s*C\)\s+/m.test(t) &&
        /(^|\n)\s*D\)\s+/m.test(t)
    );
}

function hasPlaceholderOptions(text) {
    const t = String(text || "");
    return /(^|\n)\s*A\)\s*\.\.\.\s*(\n|$)/m.test(t) ||
        /(^|\n)\s*B\)\s*\.\.\.\s*(\n|$)/m.test(t) ||
        /(^|\n)\s*C\)\s*\.\.\.\s*(\n|$)/m.test(t) ||
        /(^|\n)\s*D\)\s*\.\.\.\s*(\n|$)/m.test(t) ||
        /Options:\s*A\)\s*\.\.\.\s*B\)\s*\.\.\.\s*C\)\s*\.\.\.\s*D\)\s*\.\.\./i.test(t) ||
        /\[\s*real option text\s*\]/i.test(t) ||
        /<\s*real option text\s*>/i.test(t);
}

function hasInlineOptionsSameLine(text) {
    // Detect "A) ... B) ... C) ... D) ..." on one line
    const t = String(text || "");
    const lines = t.split(/\r?\n/);
    return lines.some((line) => (line.match(/\b[A-D]\)\s+/g) || []).length >= 2);
}

function hasInstructionalEcho(text) {
    const t = String(text || "").toLowerCase();
    return (
        t.includes("write one short question") ||
        t.includes("write a real action") ||
        t.includes("write 2-3") ||
        t.includes("[real option text]") ||
        t.includes("one real action the child can take")
    );
}

function stripPlaceholderOptionsBlock(text) {
    // Remove the templated placeholder block if the model echoes it.
    // Keep real A)/B)/C)/D) content if present elsewhere.
    let t = String(text || "");
    t = t.replace(/(^|\n)\s*Options:\s*\n\s*A\)\s*\.\.\.\s*\n\s*B\)\s*\.\.\.\s*\n\s*C\)\s*\.\.\.\s*\n\s*D\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/(^|\n)\s*Options:\s*\n\s*A\)\s*\.\.\.\s*B\)\s*\.\.\.\s*C\)\s*\.\.\.\s*D\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/(^|\n)\s*A\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/(^|\n)\s*B\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/(^|\n)\s*C\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/(^|\n)\s*D\)\s*\.\.\.\s*(\n|$)/gmi, "\n");
    t = t.replace(/\[\s*real option text\s*\]/gmi, "");
    t = t.replace(/<\s*real option text\s*>/gmi, "");
    t = t.replace(/\{\s*real option text\s*\}/gmi, "");
    return t.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeQuizText(text) {
    // Make the output easier for the UI (and reduce prompt/format glitches)
    // - normalize headings with colons
    // - split inline options onto their own lines
    // - merge "A" + next line => "A) next line"
    // - strip any remaining placeholder tokens

    const raw = stripPlaceholderOptionsBlock(String(text || ""));
    const lines = raw.split(/\r?\n/);

    const out = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Normalize headings even if model omits ":"
        if (/^\s*Scenario\s*:?\s*$/i.test(line)) { out.push("Scenario:"); continue; }
        if (/^\s*Question\s*:?\s*$/i.test(line)) { out.push("Question:"); continue; }
        if (/^\s*Options\s*:?\s*$/i.test(line)) { out.push("Options:"); continue; }

        // If a line contains multiple option markers, split them onto separate lines.
        // Example: "Do you: A) ... B) ... C) ... D) ..."
        const optionMarkers = line.match(/\b[A-D]\)\s+/g) || [];
        if (optionMarkers.length >= 2) {
            const firstOpt = line.search(/\bA\)\s+/);
            if (firstOpt >= 0) {
                const prefix = line.slice(0, firstOpt).trim();
                const optsChunk = line.slice(firstOpt);
                if (prefix) out.push(prefix);

                const parts = optsChunk.split(/(?=\b[A-D]\)\s+)/g).map(s => s.trim()).filter(Boolean);
                for (const p of parts) out.push(p);
                continue;
            }
        }

        // If the model outputs "A" on its own line, treat next non-empty line as its text.
        const loneLetter = line.match(/^\s*([A-D])\s*$/);
        if (loneLetter) {
            const letter = loneLetter[1];
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            if (j < lines.length) {
                const next = lines[j].trim();
                out.push(`${letter}) ${next}`);
                i = j; // skip consumed line
                continue;
            }
        }

        out.push(line);
    }

    // Ensure each option line starts with "A) " etc (not "A)foo")
    const fixed = out.map((l) => l.replace(/^\s*([A-D])\)\s*/i, (_, a) => `${a.toUpperCase()}) `));

    return fixed.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeWhy(why) {
    const t = String(why || "").replace(/\s+/g, " ").trim();
    if (!t) return "";

    // If it talks directly about "you" or sounds judgmental/odd, fall back to a safe explanation.
    const lower = t.toLowerCase();
    const hasSecondPerson = /\b(you|you're|youre|your|yours)\b/i.test(t);
    const hasWeirdNeg = /not interested|don't care|you are not|you're not|youre not|you should not|you shouldn't/i.test(lower);

    if (hasSecondPerson || hasWeirdNeg) {
        return "It helps to use kind words and invite someone to join. This can make others feel included and safe.";
    }

    // Keep it short and calm (1-2 sentences)
    const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(" ");
    return sentences;
}

function extractMeta(text) {
    const raw = String(text || "");
    const answerLine = raw.match(/^\s*ANSWER:\s*([A-D])\b.*$/gmi)?.pop() || "";
    const whyLine = raw.match(/^\s*WHY:\s*(.+)\s*$/gmi)?.pop() || "";

    const answer = answerLine ? (answerLine.match(/^\s*ANSWER:\s*([A-D])\b/i)?.[1] || "").toUpperCase() : null;
    const why = whyLine ? whyLine.replace(/^\s*WHY:\s*/i, "").trim() : "";

    const cleaned = raw
        .replace(/^\s*META:\s*$/gmi, "")
        .replace(/^\s*ANSWER:\s*[A-D]\b.*$/gmi, "")
        .replace(/^\s*WHY:\s*.*$/gmi, "")
        .replace(/^\s*ENDTURN\s*$/gmi, "")
        .trim();

    if (!answer || !["A", "B", "C", "D"].includes(answer)) return { cleaned, meta: null };
    return { cleaned, meta: { answer, why } };
}

// In-memory deterministic quiz state so scoring/feedback is consistent even without MongoDB.
// sessionId -> { score: number, pending: { answer: "A"|"B"|"C"|"D", why: string } | null, lastQuestion: string }
const quizState = new Map();

function extractFirstJsonObject(text) {
    const t = String(text || "").trim();
    if (!t) return null;
    if (t.startsWith("{") && t.endsWith("}")) return t;
    const match = t.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
}

function formatQuizQuestion({ scenario, question, options }) {
    const s = String(scenario || "").trim();
    const q = String(question || "").trim();
    const A = String(options?.A || "").trim();
    const B = String(options?.B || "").trim();
    const C = String(options?.C || "").trim();
    const D = String(options?.D || "").trim();

    return (
        `Scenario:\n${s}\n\n` +
        `Question:\n${q}\n\n` +
        `Options:\n` +
        `A) ${A}\n` +
        `B) ${B}\n` +
        `C) ${C}\n` +
        `D) ${D}`
    ).trim();
}

async function generateQuizQuestionJson({ topicHint }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const headers = {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
    };

    const system = [
        "You create ASD-friendly social skills multiple-choice quiz questions for children.",
        "Return ONLY valid JSON. No markdown. No extra text.",
        "Schema:",
        '{ "scenario": "2-3 short sentences", "question": "One short question starting with What would you do or What should you do?", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "answer": "A|B|C|D", "why": "1-2 short sentences, kind and neutral, avoid using \\"you\\", prefer \\"It helps to...\\"" }',
        "Rules:",
        "- Options must be real actions. No placeholders.",
        "- Exactly one best answer.",
    ].join("\n");

    const user = [
        "Generate ONE new question.",
        topicHint ? `Topic hint: ${topicHint}` : "",
    ].filter(Boolean).join("\n");

    const quizJsonSchema = {
        type: "object",
        additionalProperties: false,
        required: ["scenario", "question", "options", "answer", "why"],
        properties: {
            scenario: { type: "string" },
            question: { type: "string" },
            options: {
                type: "object",
                additionalProperties: false,
                required: ["A", "B", "C", "D"],
                properties: {
                    A: { type: "string" },
                    B: { type: "string" },
                    C: { type: "string" },
                    D: { type: "string" },
                },
            },
            answer: { type: "string", enum: ["A", "B", "C", "D"] },
            why: { type: "string" },
        },
    };

    const baseBody = {
        model: LLM_MODEL,
        temperature: 0.3,
        max_tokens: Math.max(420, LLM_MAX_TOKENS * 2),
        stream: false,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
    };

    // LM Studio requires `response_format.type` to be `json_schema` or `text`.
    // We'll try json_schema first, then fall back to plain text with strict JSON instruction.
    let res = await fetch(joinUrl(LLM_BASE_URL, "/chat/completions"), {
        method: "POST",
        headers,
        body: JSON.stringify({
            ...baseBody,
            response_format: {
                type: "json_schema",
                json_schema: { name: "quiz_question", strict: true, schema: quizJsonSchema },
            },
        }),
        signal: controller.signal,
    });

    if (!res.ok) {
        const errText = await res.text();
        // Fallback: request plain text, but still enforce JSON in the system message and parse it ourselves.
        res = await fetch(joinUrl(LLM_BASE_URL, "/chat/completions"), {
            method: "POST",
            headers,
            body: JSON.stringify({
                ...baseBody,
                response_format: { type: "text" },
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`LM Studio quiz JSON failed: ${res.status} ${errText}`);
        }
    }

    clearTimeout(timeout);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LM Studio quiz JSON failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content = String(data?.choices?.[0]?.message?.content || "").trim();
    const jsonText = extractFirstJsonObject(content);
    if (!jsonText) throw new Error("Quiz JSON parse failed: no JSON object found.");

    const parsed = JSON.parse(jsonText);
    const scenario = String(parsed?.scenario || "").trim();
    const question = String(parsed?.question || "").trim();
    const options = parsed?.options || {};
    const answer = String(parsed?.answer || "").trim().toUpperCase();
    const why = sanitizeWhy(String(parsed?.why || "").trim());

    if (!scenario || !question) throw new Error("Quiz JSON missing scenario/question.");
    if (!["A", "B", "C", "D"].includes(answer)) throw new Error("Quiz JSON invalid answer.");
    const optA = String(options?.A || "").trim();
    const optB = String(options?.B || "").trim();
    const optC = String(options?.C || "").trim();
    const optD = String(options?.D || "").trim();
    if (!optA || !optB || !optC || !optD) throw new Error("Quiz JSON missing options.");

    // Reject placeholder-y options/questions to avoid regressions.
    const bad = (s) =>
        /one real action|real action the child can take|\[|\]|<option>|\.\.\./i.test(String(s || ""));
    if (bad(optA) || bad(optB) || bad(optC) || bad(optD)) throw new Error("Quiz JSON options look like placeholders.");
    if (!/^(what would you do|what should you do)\b/i.test(question)) throw new Error("Quiz JSON question must start with 'What would you do' or 'What should you do'.");
    if (/\b[A-D]\)\s+/.test(question)) throw new Error("Quiz JSON question must not contain option markers.");

    return {
        scenario,
        question,
        options: { A: optA, B: optB, C: optC, D: optD },
        answer,
        why,
    };
}

async function gradeAnswerWithLlm({ questionText, userAnswerLetter }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(LLM_TIMEOUT_MS, 45000));

    const headers = {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
    };

    const res = await fetch(joinUrl(LLM_BASE_URL, "/chat/completions"), {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: LLM_MODEL,
            temperature: 0,
            max_tokens: 180,
            stream: false,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a strict quiz grader. Return ONLY valid JSON like: " +
                        '{"correctLetter":"A","isCorrect":true,"why":"..."} ' +
                        'No markdown, no extra text. "correctLetter" must be one of A,B,C,D. "why" is 1-2 short sentences, kind and neutral. Avoid blaming. Avoid using "you". Prefer "It helps to...".',
                },
                {
                    role: "user",
                    content:
                        `QUESTION TEXT:\n${questionText}\n\nUSER ANSWER: ${userAnswerLetter}\n\nReturn JSON now.`,
                },
            ],
        }),
        signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM grade failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content = String(data?.choices?.[0]?.message?.content || "").trim();
    // best-effort JSON extraction
    const jsonText = content.startsWith("{") ? content : (content.match(/\{[\s\S]*\}/)?.[0] || "");
    const parsed = JSON.parse(jsonText);
    const correctLetter = String(parsed?.correctLetter || "").toUpperCase();
    const isCorrect = Boolean(parsed?.isCorrect);
    const why = sanitizeWhy(String(parsed?.why || "").trim());

    if (!["A", "B", "C", "D"].includes(correctLetter)) throw new Error("Invalid correctLetter from grader.");
    return { correctLetter, isCorrect, why };
}

app.post("/quiz/chat", async (req, res) => {
    try {
        const { sessionId, message, conversationHistory = [], displayName = "User" } = req.body || {};

        const sid = sessionId || "anon";
        if (!quizState.has(sid)) quizState.set(sid, { score: 0, pending: null, lastQuestion: "" });
        const state = quizState.get(sid);

        const normalizedMsg = String(message || "").trim();
        const upper = normalizedMsg.toUpperCase();

        // Answer flow -> feedback only. User presses "Next Question" to continue.
        if (/^[A-D]$/.test(upper)) {
            const pending = state.pending;

            if (!pending) {
                // Fallback: if we lost META, grade using the last question text.
                if (state.lastQuestion) {
                    let isCorrect = false;
                    let why = "";
                    try {
                        const graded = await gradeAnswerWithLlm({ questionText: state.lastQuestion, userAnswerLetter: upper });
                        isCorrect = graded.isCorrect;
                        why = graded.why || "";
                    } catch (e) {
                        console.warn("Grade fallback failed:", e?.message || e);
                    }

                    if (isCorrect) state.score += 1;
                    const response = isCorrect
                        ? `Correct! Great job.\n\nScore: ${state.score} points.\n\nPress Next Question to continue.`
                        : `Not quite.\n\n${why || "It helps to use calm words, listen, and ask for help if needed."}\n\nScore: ${state.score} points.\n\nPress Next Question to continue.`;

                    // Persist quiz progress into per-user gameProgress (guest by session or logged-in by token)
                    try {
                        const u = await getUserForRequest(req, { sessionIdFallback: sessionId });
                        if (u) {
                            if (!u.gameProgress) u.gameProgress = {};
                            if (!u.gameProgress.whatWouldYouDo) u.gameProgress.whatWouldYouDo = {};
                            const g = u.gameProgress.whatWouldYouDo;
                            g.timePlayed = (g.timePlayed || 0) + 1;
                            if (isCorrect) g.wins = (g.wins || 0) + 1;
                            g.score = state.score;
                            if (!g.sessions) g.sessions = [];
                            g.sessions.push({ date: new Date(), timePlayed: 1, emotionTime: {} });
                            if (g.sessions.length > 20) g.sessions = g.sessions.slice(-20);
                            u.markModified("gameProgress");
                            await u.save();
                        }
                    } catch (e) {
                        console.warn("Quiz progress save skipped:", e?.message || e);
                    }

                    // Best-effort save to MongoDB if available
                    if (sessionId && mongoose.connection.readyState === 1) {
                        try {
                            let scoreDoc = await QuizScore.findOne({ sessionId });
                            if (!scoreDoc) scoreDoc = new QuizScore({ sessionId, displayName, points: 0, questionsAnswered: 0 });
                            scoreDoc.points = state.score;
                            scoreDoc.questionsAnswered = (scoreDoc.questionsAnswered || 0) + 1;
                            scoreDoc.updatedAt = new Date();
                            await scoreDoc.save();
                        } catch (dbErr) {
                            console.warn("Quiz score save skipped (MongoDB not connected):", dbErr.message);
                        }
                    }

                    return res.json({ kind: "feedback", response, points: state.score });
                }

                return res.json({
                    kind: "feedback",
                    response: `I didn’t get the question yet. Press Next Question and then pick A, B, C, or D.`,
                    points: state.score,
                });
            }

            const isCorrect = upper === pending.answer;
            if (isCorrect) state.score += 1;

            const safeWhy = sanitizeWhy(pending.why);
            const response = isCorrect
                ? `Correct! Great job making a kind choice.\n\nScore: ${state.score} points.\n\nPress Next Question to continue.`
                : `Not quite.\n\n${safeWhy || "It helps to use calm words, listen, and ask for help if needed."}\n\nScore: ${state.score} points.\n\nPress Next Question to continue.`;

            state.pending = null;

            // Persist quiz progress into per-user gameProgress (guest by session or logged-in by token)
            try {
                const u = await getUserForRequest(req, { sessionIdFallback: sessionId });
                if (u) {
                    if (!u.gameProgress) u.gameProgress = {};
                    if (!u.gameProgress.whatWouldYouDo) u.gameProgress.whatWouldYouDo = {};
                    const g = u.gameProgress.whatWouldYouDo;
                    g.timePlayed = (g.timePlayed || 0) + 1;
                    if (isCorrect) g.wins = (g.wins || 0) + 1;
                    g.score = state.score;
                    if (!g.sessions) g.sessions = [];
                    g.sessions.push({ date: new Date(), timePlayed: 1, emotionTime: {} });
                    if (g.sessions.length > 20) g.sessions = g.sessions.slice(-20);
                    u.markModified("gameProgress");
                    await u.save();
                }
            } catch (e) {
                console.warn("Quiz progress save skipped:", e?.message || e);
            }

            // Best-effort save to MongoDB if available
            if (sessionId && mongoose.connection.readyState === 1) {
                try {
                    let scoreDoc = await QuizScore.findOne({ sessionId });
                    if (!scoreDoc) scoreDoc = new QuizScore({ sessionId, displayName, points: 0, questionsAnswered: 0 });
                    scoreDoc.points = state.score;
                    scoreDoc.questionsAnswered = (scoreDoc.questionsAnswered || 0) + 1;
                    scoreDoc.updatedAt = new Date();
                    await scoreDoc.save();
                } catch (dbErr) {
                    console.warn("Quiz score save skipped (MongoDB not connected):", dbErr.message);
                }
            }

            return res.json({ kind: "feedback", response, points: state.score });
        }

        // Generate question deterministically via JSON, then format into the UI-friendly text.
        const isNext = normalizedMsg.toLowerCase().includes("next");
        const topicHint = isNext ? "" : normalizedMsg;

        let q = null;
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                q = await generateQuizQuestionJson({ topicHint });
                break;
            } catch (e) {
                lastErr = e;
            }
        }
        if (!q) throw lastErr || new Error("Failed to generate quiz question.");

        const formatted = formatQuizQuestion({ scenario: q.scenario, question: q.question, options: q.options });
        state.pending = { answer: q.answer, why: q.why };
        state.lastQuestion = formatted;

        return res.json({ kind: "question", response: formatted, points: state.score });
    } catch (err) {
        console.error("Quiz chat error:", err);
        res.status(500).json({
            error: "Failed to get quiz response",
            details: err.name === "AbortError"
                ? `LM Studio timed out (${Math.round(LLM_TIMEOUT_MS / 1000)}s). Check the LM Studio server is running at ${LLM_BASE_URL}.`
                : err.message,
        });
    }
});

app.get("/quiz/scores/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const state = quizState.get(sessionId);
        const points = state?.score || 0;

        if (mongoose.connection.readyState === 1) {
            const scoreDoc = await QuizScore.findOne({ sessionId }).lean();
            if (scoreDoc) return res.json(scoreDoc);
        }

        res.json({ points, questionsAnswered: 0, displayName: "User" });
    } catch (err) {
        console.error(err);
        res.json({ points: 0, questionsAnswered: 0, displayName: "User" });
    }
});

app.get("/quiz/leaderboard", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) return res.json([]);
        const limit = parseInt(req.query.limit, 10) || 10;
        const scores = await QuizScore.find().sort({ points: -1, updatedAt: -1 }).limit(limit).lean();
        res.json(scores);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// ── Game Progress ──────────────────────────────────────────────────────────────

app.get("/progress", async (req, res) => {
    try {
        const userDoc = await getUserForRequest(req);
        if (!userDoc) {
            if (AUTH_BYPASS) {
                const defaultEmotionTime = { happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0, neutral: 0 };
                const defaultGame = (overrides = {}) => ({ timePlayed: 0, wins: 0, score: 0, emotionTime: { ...defaultEmotionTime }, ...overrides });
                const empty = defaultGame();
                return res.json({
                    ticTacToe: empty,
                    mathGame: empty,
                    mirrorEmotions: empty,
                    colorPattern: empty,
                    neonRhythm: empty,
                    astralJump: empty,
                    whatWouldYouDo: empty,
                    storyReader: empty,
                });
            }
            return res.status(401).json({ message: "Not logged in" });
        }

        const user = userDoc.toObject ? userDoc.toObject() : userDoc;

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
    try {
        const user = await getUserForRequest(req);
        if (!user) {
            if (AUTH_BYPASS) {
                return res.status(400).json({ message: "Missing session id. Send x-session-id header in guest mode." });
            }
            return res.status(401).json({ message: "Not logged in" });
        }

        const { game, addTimePlayed, addWins, setScore, addScore, addComputerWins, addTies, setLevel, addEmotionTime } = req.body;

        if (!user.gameProgress) user.gameProgress = {};
        if (!user.gameProgress[game]) user.gameProgress[game] = {};

        const g = user.gameProgress[game];

        let didAnyUpdate = false;

        if (addTimePlayed) { g.timePlayed = (g.timePlayed || 0) + addTimePlayed; didAnyUpdate = true; }
        if (addWins) { g.wins = (g.wins || 0) + addWins; didAnyUpdate = true; }
        if (addComputerWins) { g.computerWins = (g.computerWins || 0) + addComputerWins; didAnyUpdate = true; }
        if (addTies) { g.ties = (g.ties || 0) + addTies; didAnyUpdate = true; }
        if (setScore !== undefined && setScore > (g.score || 0)) { g.score = setScore; didAnyUpdate = true; }
        if (addScore) { g.score = (g.score || 0) + addScore; didAnyUpdate = true; }
        if (setLevel !== undefined && setLevel > (g.level || 0)) { g.level = setLevel; didAnyUpdate = true; }

        let normalizedEmotionTime = null;
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
            normalizedEmotionTime = normalized;
            didAnyUpdate = true;
        }

        // Record session for trend graphs whenever anything updates (not only when emotionTime exists)
        if (didAnyUpdate) {
            if (!g.sessions) g.sessions = [];
            g.sessions.push({
                date: new Date(),
                timePlayed: addTimePlayed || 0,
                emotionTime: normalizedEmotionTime ? { ...normalizedEmotionTime } : {},
            });
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