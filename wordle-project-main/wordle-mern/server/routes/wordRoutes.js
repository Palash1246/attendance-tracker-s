import express from "express";
import Word from "../models/Word.js";
import ValidWord from "../models/ValidWord.js";
import UsedWord from "../models/UsedWord.js";

const router = express.Router();

// Returns the index for today's word based on days since a fixed epoch.
// Same index for all users on the same UTC day.
function getDayIndex() {
  const epoch = new Date("2024-01-01T00:00:00Z").getTime();
  const now = Date.now();
  return Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
}

router.get("/word", async (req, res) => {
  try {
    const totalWords = await Word.countDocuments();
    if (totalWords === 0) {
      return res.status(500).json({ error: "Word list is empty. Run the seed script." });
    }

    const dayIndex = getDayIndex() % totalWords;

    // Sort by _id for a stable, consistent ordering across calls.
    const [wordDoc] = await Word.find().sort({ _id: 1 }).skip(dayIndex).limit(1);

    if (!wordDoc) {
      return res.status(500).json({ error: "Could not retrieve word of the day." });
    }

    console.log(`Day ${getDayIndex()} — Word: ${wordDoc.text}`);

    // Log this word as used (upsert so we don't duplicate within same day)
    await UsedWord.updateOne(
      { text: wordDoc.text },
      { $setOnInsert: { text: wordDoc.text, usedOn: new Date() } },
      { upsert: true }
    );

    // Return only the length so the client knows the word size
    // but does NOT receive the answer in plaintext.
    res.json({ length: wordDoc.text.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/check", async (req, res) => {
  try {
    const { guess } = req.body;

    // --- Input Validation ---
    if (typeof guess !== "string") {
      return res.status(400).json({ error: "Guess must be a string." });
    }
    const sanitized = guess.trim().toLowerCase();
    if (!/^[a-z]{5}$/.test(sanitized)) {
      return res.status(400).json({ error: "Guess must be exactly 5 alphabetic characters." });
    }

    // --- Dictionary Check ---
    const isValid = await ValidWord.exists({ text: sanitized });
    if (!isValid) {
      return res.status(400).json({ error: "Not a valid word" });
    }

    // --- Re-derive today's word (no in-memory state needed) ---
    const totalWords = await Word.countDocuments();
    const dayIndex = getDayIndex() % totalWords;
    const [wordDoc] = await Word.find().sort({ _id: 1 }).skip(dayIndex).limit(1);

    if (!wordDoc) {
      return res.status(500).json({ error: "Could not retrieve word of the day." });
    }

    const currentWord = wordDoc.text.toLowerCase();

    // --- Correct two-pass duplicate-letter algorithm ---
    const result = Array(5).fill("absent");
    const answerLetterPool = currentWord.split("");

    // Pass 1: mark all exact matches (correct)
    for (let i = 0; i < 5; i++) {
      if (sanitized[i] === answerLetterPool[i]) {
        result[i] = "correct";
        answerLetterPool[i] = null; // consume this letter
      }
    }

    // Pass 2: mark present letters (exist in word but wrong position)
    for (let i = 0; i < 5; i++) {
      if (result[i] === "correct") continue;
      const idx = answerLetterPool.indexOf(sanitized[i]);
      if (idx !== -1) {
        result[i] = "present";
        answerLetterPool[idx] = null; // consume so it can't be matched again
      }
    }

    const isWin = result.every((r) => r === "correct");

    res.json({
      result,
      isWin,
      // Only reveal the answer if the player has won or lost (after 6 guesses).
      // The client must pass attemptCount so the server can decide.
      ...(req.body.attemptCount >= 6 && !isWin ? { answer: currentWord } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
