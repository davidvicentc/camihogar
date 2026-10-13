import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FaqSchema = new Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export type Faq = InferSchemaType<typeof FaqSchema>;
const FaqModel: Model<Faq> = (mongoose.models.Faq as Model<Faq>) ?? mongoose.model<Faq>("Faq", FaqSchema);
export default FaqModel;
