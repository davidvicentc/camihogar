import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VisitorPresenceSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  lastSeen: { type: Date, required: true, index: true },
  expiresAt: { type: Date, required: true },
});

VisitorPresenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VisitorPresence = InferSchemaType<typeof VisitorPresenceSchema>;

const VisitorPresenceModel: Model<VisitorPresence> =
  (mongoose.models.VisitorPresence as Model<VisitorPresence>) ??
  mongoose.model<VisitorPresence>("VisitorPresence", VisitorPresenceSchema);

export default VisitorPresenceModel;
