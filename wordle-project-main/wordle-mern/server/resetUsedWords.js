import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UsedWord from './models/UsedWord.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const result = await UsedWord.deleteMany({});
console.log(`✅ Cleared ${result.deletedCount} used word(s) from the log.`);
await mongoose.disconnect();
process.exit(0);
