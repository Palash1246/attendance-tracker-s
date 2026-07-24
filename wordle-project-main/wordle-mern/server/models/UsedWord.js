import mongoose from 'mongoose';

const usedWordSchema = new mongoose.Schema({
  text:   { type: String, required: true },
  usedOn: { type: Date,   default: Date.now },
});

export default mongoose.model('UsedWord', usedWordSchema);
