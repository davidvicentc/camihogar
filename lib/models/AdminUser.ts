import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type AdminUser = InferSchemaType<typeof AdminUserSchema>;
const AdminUserModel: Model<AdminUser> =
  (mongoose.models.AdminUser as Model<AdminUser>) ??
  mongoose.model<AdminUser>("AdminUser", AdminUserSchema);

export default AdminUserModel;