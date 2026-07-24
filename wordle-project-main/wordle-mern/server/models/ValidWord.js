import mongoose from 'mongoose';

const validWordSchema = new mongoose.Schema({
  text: { type: String, required: true, unique: true, index: true },
});

export default mongoose.model('ValidWord', validWordSchema);
