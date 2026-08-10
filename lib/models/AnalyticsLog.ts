import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const EVENT_TYPES = ["VIEW", "WHATSAPP_CLICK", "CUSTOMIZER_OPEN"] as const;

const AnalyticsLogSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
    index: true,
  },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Consultas del dashboard: eventos por producto y rango de fechas.
AnalyticsLogSchema.index({ eventType: 1, timestamp: -1 });

export type AnalyticsLog = InferSchemaType<typeof AnalyticsLogSchema>;

const AnalyticsLogModel: Model<AnalyticsLog> =
  (mongoose.models.AnalyticsLog as Model<AnalyticsLog>) ??
  mongoose.model<AnalyticsLog>("AnalyticsLog", AnalyticsLogSchema);

export default AnalyticsLogModel;
