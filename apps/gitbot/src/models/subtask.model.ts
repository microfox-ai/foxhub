import { Schema, model, Document, Types } from "mongoose";

export enum SubtaskStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

export interface ISubtask extends Document {
  taskId: Types.ObjectId;
  name: string; // Identifier for the type of subtask
  status: SubtaskStatus;
  data?: Record<string, any>; // Optional data specific to the subtask
  attempts: number; // To track retries if needed
  lastAttemptedAt?: Date | null;
  completedAt?: Date | null;
  error?: string | null; // Store error message if failed
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema<ISubtask>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SubtaskStatus),
      default: SubtaskStatus.Pending,
      index: true,
    },
    data: { type: Schema.Types.Mixed },
    attempts: { type: Number, default: 0 },
    lastAttemptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

export const Subtask = model<ISubtask>("Subtask", SubtaskSchema);
