"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "@/styles/quiz.module.css";
import { sessionHeaders } from "@/lib/session";

function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("quizAiSessionId");
    if (!id) {
        id = crypto.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("quizAiSessionId", id);
    }
    return id;
}

function parseScore(text: string): number | null {
    const match = text.match(/Score:\s*(\d+)\s*points?\.?/i);
    return match ? parseInt(match[1], 10) : null;
}

function shouldShowOptions(text: string): boolean {
    // Be resilient: some models omit the "Options:" label but still list A) B) C) D)
    const hasOptionsLabel = /(^|\n)Options:\s*/i.test(text);
    const hasABCDLines =
        /(^|\n)\s*A\)\s+/m.test(text) &&
        /(^|\n)\s*B\)\s+/m.test(text) &&
        /(^|\n)\s*C\)\s+/m.test(text) &&
        /(^|\n)\s*D\)\s+/m.test(text);
    const hasAtLeastAB = /(^|\n)\s*A\)\s+/m.test(text) && /(^|\n)\s*B\)\s+/m.test(text);
    return hasOptionsLabel || hasABCDLines || hasAtLeastAB;
}

function hasAnyOptionLine(text: string): boolean {
    return /(^|\n)\s*[A-D]\)\s+/m.test(text);
}

export default function QuizAiPage() {
    const [sessionId, setSessionId] = useState("");
    const [assistantText, setAssistantText] = useState("");
    const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [phase, setPhase] = useState<"question" | "feedback">("question");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [points, setPoints] = useState(0);

    // Text-to-speech (TTS) state
    const [ttsStatus, setTtsStatus] = useState<"idle" | "playing" | "paused">("idle");
    const [spokenWordIdx, setSpokenWordIdx] = useState<number | null>(null);
    const ttsBoundaryCountRef = useRef(0);
    const ttsFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ttsSeqCancelRef = useRef(false);

    useEffect(() => {
        setSessionId(getOrCreateSessionId());
    }, []);

    const ttsSupported =
        typeof window !== "undefined" &&
        typeof window.speechSynthesis !== "undefined" &&
        typeof (window as any).SpeechSynthesisUtterance !== "undefined";

    const tokenized = useMemo(() => {
        const text = assistantText || "";
        const parts: Array<{ kind: "ws" | "word"; text: string; wordIndex?: number }> = [];
        const wordStarts: number[] = [];
        const lineParts: Array<Array<{ kind: "ws" | "word"; text: string; wordIndex?: number }>> = [[]];
        const lineTexts: string[] = [""];

        let pos = 0;
        let wIdx = 0;
        const re = /(\s+)/g;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
            const word = text.slice(last, m.index);
            if (word) {
                wordStarts.push(pos);
                const seg = { kind: "word" as const, text: word, wordIndex: wIdx };
                parts.push(seg);
                lineParts[lineParts.length - 1].push(seg);
                lineTexts[lineTexts.length - 1] += word;
                wIdx += 1;
                pos += word.length;
            }
            const ws = m[1];
            if (ws) {
                const wsSeg = { kind: "ws" as const, text: ws };
                parts.push(wsSeg);
                // split into lines on \n so we can render child-friendly blocks
                const chunks = ws.split("\n");
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    if (chunk) {
                        const seg = { kind: "ws" as const, text: chunk };
                        lineParts[lineParts.length - 1].push(seg);
                        lineTexts[lineTexts.length - 1] += chunk;
                    }
                    if (i < chunks.length - 1) {
                        lineParts.push([]);
                        lineTexts.push("");
                    }
                }
                pos += ws.length;
            }
            last = m.index + ws.length;
        }
        const tail = text.slice(last);
        if (tail) {
            wordStarts.push(pos);
            const seg = { kind: "word" as const, text: tail, wordIndex: wIdx };
            parts.push(seg);
            lineParts[lineParts.length - 1].push(seg);
            lineTexts[lineTexts.length - 1] += tail;
        }

        return {
            parts,
            wordStarts,
            lineParts,
            lineTexts,
            wordCount: wIdx + (tail ? 1 : 0),
            fullText: text,
        };
    }, [assistantText]);

    type Seg = { kind: "ws" | "word"; text: string; wordIndex?: number };

    const structured = useMemo(() => {
        const lines = tokenized.lineParts as Seg[][] | undefined;
        const texts = tokenized.lineTexts as string[] | undefined;
        if (!lines || !texts) return null;

        const normalizeLine = (segs: Seg[]) => {
            const out = [...segs];
            while (out.length && out[0].kind === "ws") out.shift();
            while (out.length && out[out.length - 1].kind === "ws") out.pop();
            return out;
        };

        const appendLine = (dst: Seg[], segs: Seg[]) => {
            const n = normalizeLine(segs);
            if (!n.length) return;
            if (dst.length) dst.push({ kind: "ws", text: " " });
            dst.push(...n);
        };

        let mode: "none" | "scenario" | "question" | "options" = "none";
        const scenarioSegs: Seg[] = [];
        const questionSegs: Seg[] = [];
        const options: Array<{ letter: string; segs: Seg[] }> = [];

        for (let i = 0; i < lines.length; i++) {
            const raw = (texts[i] || "").trim();
            if (!raw) continue;

            if (/^Scenario:\s*$/i.test(raw)) {
                mode = "scenario";
                continue;
            }
            if (/^Question:\s*$/i.test(raw)) {
                mode = "question";
                continue;
            }
            if (/^Options:\s*$/i.test(raw)) {
                mode = "options";
                continue;
            }

            if (mode === "options") {
                const m = raw.match(/^\s*([A-D])\)\s+/);
                if (m) {
                    const letter = m[1];
                    const prefixLen = m[0].length;
                    const segs = trimSegmentsPrefix(lines[i] as any, prefixLen) as Seg[];
                    options.push({ letter, segs: normalizeLine(segs) });
                }
                continue;
            }

            if (mode === "scenario") appendLine(scenarioSegs, lines[i] as any);
            if (mode === "question") appendLine(questionSegs, lines[i] as any);
        }

        const combined: Seg[] = [];
        if (scenarioSegs.length) combined.push(...scenarioSegs);
        if (scenarioSegs.length && questionSegs.length) combined.push({ kind: "ws", text: " " });
        if (questionSegs.length) combined.push(...questionSegs);

        if (!combined.length && !options.length) return null;
        return { questionSegs: combined, options };
    }, [tokenized.lineParts, tokenized.lineTexts]);

    function findWordIndexByCharIndex(charIndex: number): number {
        const starts = tokenized.wordStarts;
        if (!starts.length) return 0;
        let lo = 0, hi = starts.length - 1, ans = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (starts[mid] <= charIndex) {
                ans = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return ans;
    }

    function stopTts() {
        if (!ttsSupported) return;
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
        if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);
        ttsFallbackTimerRef.current = null;
        ttsSeqCancelRef.current = true;
        ttsBoundaryCountRef.current = 0;
        setTtsStatus("idle");
        setSpokenWordIdx(null);
    }

    function pauseTts() {
        if (!ttsSupported) return;
        try { window.speechSynthesis.pause(); } catch { /* ignore */ }
        setTtsStatus("paused");
    }

    function resumeTts() {
        if (!ttsSupported) return;
        try { window.speechSynthesis.resume(); } catch { /* ignore */ }
        setTtsStatus("playing");
    }

    function speakWordsSequentially(startWordIndex: number) {
        if (!ttsSupported) return;
        const wordsOnly = tokenized.parts.filter((p) => p.kind === "word") as Array<{
            kind: "word";
            text: string;
            wordIndex: number;
        }>;
        if (!wordsOnly.length) return;

        ttsSeqCancelRef.current = false;
        setTtsStatus("playing");

        const startPos = Math.max(0, Math.min(startWordIndex, wordsOnly.length - 1));

        const speakAt = (i: number) => {
            if (ttsSeqCancelRef.current) return;
            if (i >= wordsOnly.length) {
                setTtsStatus("idle");
                setSpokenWordIdx(null);
                return;
            }
            const w = wordsOnly[i];
            const u = new (window as any).SpeechSynthesisUtterance(w.text);
            u.rate = 0.95;
            u.pitch = 1;
            u.onstart = () => setSpokenWordIdx(w.wordIndex);
            u.onend = () => speakAt(i + 1);
            u.onerror = () => {
                setTtsStatus("idle");
                setSpokenWordIdx(null);
            };
            try { window.speechSynthesis.speak(u); } catch { /* ignore */ }
        };

        speakAt(startPos);
    }

    function speakCurrentText() {
        if (!ttsSupported) return;
        if (!tokenized.fullText.trim()) return;

        stopTts();
        ttsBoundaryCountRef.current = 0;

        const u = new (window as any).SpeechSynthesisUtterance(tokenized.fullText);
        u.rate = 0.95;
        u.pitch = 1;
        u.onstart = () => {
            setTtsStatus("playing");
            setSpokenWordIdx(0);
        };
        u.onboundary = (e: any) => {
            if (typeof e?.charIndex === "number") {
                ttsBoundaryCountRef.current += 1;
                setSpokenWordIdx(findWordIndexByCharIndex(e.charIndex));
            }
        };
        u.onend = () => {
            setTtsStatus("idle");
            setSpokenWordIdx(null);
        };
        u.onerror = () => {
            setTtsStatus("idle");
            setSpokenWordIdx(null);
        };

        try { window.speechSynthesis.speak(u); } catch { /* ignore */ }

        // Fallback for browsers that don't emit boundary events reliably
        if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);
        ttsFallbackTimerRef.current = setTimeout(() => {
            if (ttsBoundaryCountRef.current > 0) return;
            try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
            speakWordsSequentially(0);
        }, 1200);
    }

    function trimSegmentsPrefix(
        segments: Array<{ kind: "ws" | "word"; text: string; wordIndex?: number }>,
        prefixChars: number
    ) {
        let remaining = prefixChars;
        const out: typeof segments = [];
        for (const seg of segments) {
            if (remaining <= 0) {
                out.push(seg);
                continue;
            }
            const len = seg.text.length;
            if (len <= remaining) {
                remaining -= len;
                continue;
            }
            // partial trim
            const sliced = seg.text.slice(remaining);
            remaining = 0;
            out.push({ ...seg, text: sliced });
        }
        return out;
    }

    useEffect(() => {
        return () => stopTts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const waitingForAnswer = useMemo(() => {
        if (!assistantText) return false;
        if (assistantText.includes("You finished")) return false;
        return phase === "question" && shouldShowOptions(assistantText);
    }, [assistantText]);

    const needsNextQuestionButton = useMemo(() => {
        if (!quizStarted) return false;
        if (loading) return false;
        if (!assistantText) return false;
        if (assistantText.toLowerCase().includes("you finished")) return false;
        // Always show next button on feedback phase.
        if (phase === "feedback") return true;
        // If the model didn't include any A)/B)/C)/D) lines, user can't proceed.
        return !hasAnyOptionLine(assistantText);
    }, [assistantText, loading, quizStarted, phase]);

    async function sendToServer(message: string, attempt: number = 0) {
        if (loading) return;
        stopTts();
        const sid = getOrCreateSessionId();
        setLoading(true);
        setError("");
        if (!assistantText) setAssistantText("Loading...");

        try {
            const outgoingHistory = history.slice(-6); // keep it small for speed
            const res = await fetch("http://localhost:5001/quiz/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...sessionHeaders("quizAiSessionId") },
                body: JSON.stringify({ sessionId: sid, message, conversationHistory: outgoingHistory }),
            });

            const text = await res.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text || `Request failed (${res.status})`);
            }
            if (!res.ok) throw new Error(data?.details || data?.error || "Request failed");

            const cleaned = String(data?.response || "")
                .replace(/^\s*ENDTURN\s*$/gim, "")
                .replace(/\s*ENDTURN\s*$/i, "")
                .trim();
            if (!cleaned) {
                // LM Studio can occasionally return an empty completion while loading/warming.
                // Treat as retryable and show a loading message instead of failing immediately.
                if (attempt < 3) {
                    setAssistantText(attempt === 0 ? "Loading..." : "Still loading...");
                    setLoading(false);
                    setTimeout(() => void sendToServer(message, attempt + 1), 700 * (attempt + 1));
                    return;
                }
                throw new Error("Model returned an empty response. Try again.");
            }
            setAssistantText(cleaned);
            if (data?.kind === "feedback") setPhase("feedback");
            if (data?.kind === "question") setPhase("question");

            if (typeof data?.points === "number" && Number.isFinite(data.points)) {
                setPoints(data.points);
            }

            const score = parseScore(cleaned);
            if (score != null) setPoints(score);

            setHistory((prev) =>
                [
                    ...prev,
                    { role: "user" as const, content: message },
                    { role: "assistant" as const, content: cleaned },
                ].slice(-8)
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start AI quiz.");
        } finally {
            setLoading(false);
        }
    }

    const handleStart = () => {
        if (loading) return;
        stopTts();
        setHistory([]);
        setQuizStarted(true);
        setPhase("question");
        // Don't clear the screen to blank if a request is already in-flight.
        // Keep prior content until the next response arrives.
        setAssistantText("Loading...");
        sendToServer("Start the quiz please.");
    };
    const handleAnswer = (letter: string) => {
        if (loading) return;
        stopTts();
        sendToServer(letter);
    };
    const handleNextQuestion = () => {
        if (loading) return;
        stopTts();
        setPhase("question");
        setAssistantText("Loading...");
        sendToServer("Next question.");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>What Would You Do?</h1>
                <div className={styles.scoreBadge}>Score: {points} points</div>
            </div>

            <div className={styles.content}>
                {!quizStarted ? (
                    <div className={styles.startSection}>
                        <p className={styles.startText}>Ready to play “What Would You Do?”</p>
                        <button className={styles.startButton} onClick={handleStart} disabled={loading}>
                            {loading ? "Starting…" : "Start Quiz"}
                        </button>
                    </div>
                ) : (
                    <div className={styles.quizArea}>
                        <div className={styles.ttsRow}>
                            <button
                                className={styles.ttsButton}
                                onClick={speakCurrentText}
                                disabled={!ttsSupported || loading || !assistantText || ttsStatus === "playing"}
                                title={!ttsSupported ? "Text-to-speech not supported in this browser." : "Read aloud"}
                            >
                                Read Aloud
                            </button>
                            {ttsStatus === "playing" && (
                                <button className={styles.ttsButton} onClick={pauseTts} disabled={!ttsSupported}>
                                    Pause
                                </button>
                            )}
                            {ttsStatus === "paused" && (
                                <button className={styles.ttsButton} onClick={resumeTts} disabled={!ttsSupported}>
                                    Resume
                                </button>
                            )}
                            {ttsStatus !== "idle" && (
                                <button className={styles.ttsButton} onClick={stopTts} disabled={!ttsSupported}>
                                    Stop
                                </button>
                            )}
                        </div>
                        <div className={styles.messages}>
                            <div className={styles.assistantMessage}>
                                <div className={styles.messagePre} aria-live="polite">
                                    {structured ? (
                                        <>
                                            <div className={styles.sectionLabel}>Question</div>
                                            <div className={styles.questionBlock}>
                                                {structured.questionSegs.map((p, i) =>
                                                    p.kind === "ws" ? (
                                                        <span key={i}>{p.text}</span>
                                                    ) : (
                                                        <span
                                                            key={i}
                                                            className={[
                                                                styles.wordToken,
                                                                p.wordIndex === spokenWordIdx ? styles.wordSpoken : "",
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" ")}
                                                        >
                                                            {p.text}
                                                        </span>
                                                    )
                                                )}
                                            </div>

                                            <div className={styles.sectionLabel}>Options</div>
                                            <div className={styles.optionsList}>
                                                {structured.options.map((opt) => (
                                                    <div key={opt.letter} className={styles.optionLine}>
                                                        <div className={styles.optionBadge}>{opt.letter}</div>
                                                        <div className={styles.optionText}>
                                                            {opt.segs.map((p, i) =>
                                                                p.kind === "ws" ? (
                                                                    <span key={i}>{p.text}</span>
                                                                ) : (
                                                                    <span
                                                                        key={i}
                                                                        className={[
                                                                            styles.wordToken,
                                                                            p.wordIndex === spokenWordIdx ? styles.wordSpoken : "",
                                                                        ]
                                                                            .filter(Boolean)
                                                                            .join(" ")}
                                                                    >
                                                                        {p.text}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {tokenized.parts.length ? (
                                                tokenized.parts.map((p, i) =>
                                                    p.kind === "ws" ? (
                                                        <span key={i}>{p.text}</span>
                                                    ) : (
                                                        <span
                                                            key={i}
                                                            className={[
                                                                styles.wordToken,
                                                                p.wordIndex === spokenWordIdx ? styles.wordSpoken : "",
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" ")}
                                                        >
                                                            {p.text}
                                                        </span>
                                                    )
                                                )
                                            ) : (
                                                <span>{assistantText || (loading ? "Loading next question..." : "")}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {waitingForAnswer && (
                            <div className={styles.optionsRow}>
                                {["A", "B", "C", "D"].map((letter) => (
                                    <button
                                        key={letter}
                                        className={styles.optionButton}
                                        onClick={() => handleAnswer(letter)}
                                        disabled={loading}
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>
                        )}

                        {needsNextQuestionButton && (
                            <div style={{ marginTop: "1rem" }}>
                                <button
                                    className={styles.startButton}
                                    onClick={handleNextQuestion}
                                    disabled={loading}
                                >
                                    Next Question
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.navBar}>
                <Link href="/page4" className={styles.navButton}>
                    ← Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

