/**
 * Given an array of guess results from the server,
 * builds a map of each letter -> its best known status.
 * Used to color the on-screen keyboard keys.
 * Priority: correct > present > absent
 */
export function buildKeyStates(guesses) {
  const priority = { correct: 3, present: 2, absent: 1 };
  const states = {};

  for (const { guess, result } of guesses) {
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i].toUpperCase();
      const status = result[i];
      if (!states[letter] || priority[status] > priority[states[letter]]) {
        states[letter] = status;
      }
    }
  }

  return states;
}

/**
 * Formats the current UTC date as YYYY-MM-DD.
 * Useful for displaying "Wordle #123" or the date to the user.
 */
export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
