const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export async function fetchWordOfTheDay() {
  const res = await fetch(`${API_URL}/word`);
  if (!res.ok) throw new Error("Failed to fetch word of the day");
  return res.json(); // returns { length: 5 }
}

export async function submitGuess(guess, attemptCount) {
  const res = await fetch(`${API_URL}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess, attemptCount }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to submit guess");
  }
  return data;
}
