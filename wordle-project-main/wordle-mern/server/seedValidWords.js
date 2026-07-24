import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import ValidWord from './models/ValidWord.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
await mongoose.connect(MONGO_URI);

console.log('Connected to MongoDB, seeding valid words dictionary...');

const DWYL_WORDS_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
const res = await fetch(DWYL_WORDS_URL);
const text = await res.text();

// Parse: split lines, trim whitespace, lowercase, filter to 5-letter alphabetic words only, and deduplicate
const rawWords = text
  .split(/\r?\n/)
  .map(w => w.trim().toLowerCase())
  .filter(w => /^[a-z]{5}$/.test(w));

const uniqueWords = Array.from(new Set(rawWords)).map(w => ({ text: w }));

await ValidWord.deleteMany({});
await ValidWord.insertMany(uniqueWords);

console.log(`Inserted ${uniqueWords.length} valid words into ValidWord collection.`);
await mongoose.disconnect();
process.exit(0);
