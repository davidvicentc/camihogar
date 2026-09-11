import mongoose, { Schema } from "mongoose";
const schema = new Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export default mongoose.models.AuthAttempt ?? mongoose.model("AuthAttempt", schema);
