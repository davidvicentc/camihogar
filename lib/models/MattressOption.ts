import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const MATTRESS_OPTION_KINDS = ["size", "pillow", "model", "composition"] as const;
export type MattressOptionKind = (typeof MATTRESS_OPTION_KINDS)[number];

const MattressOptionSchema = new Schema({
  kind: { type: String, enum: MATTRESS_OPTION_KINDS, required: true, index: true },
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

MattressOptionSchema.index({ kind: 1, normalizedName: 1 }, { unique: true });
MattressOptionSchema.pre("validate", function (next) {
  this.normalizedName = this.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  next();
});

export type MattressOption = InferSchemaType<typeof MattressOptionSchema>;
const MattressOptionModel: Model<MattressOption> = (mongoose.models.MattressOption as Model<MattressOption>) ?? mongoose.model<MattressOption>("MattressOption", MattressOptionSchema);
export default MattressOptionModel;
