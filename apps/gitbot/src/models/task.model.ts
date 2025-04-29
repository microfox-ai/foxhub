import { Schema, model, Document, Types } from "mongoose";

export interface ITask extends Document {
  pullRequestId: number;
  pullRequestUrl: string;
  repositoryOwner: string;
  repositoryName: string;
  status: "pending" | "processing" | "completed" | "failed" | "timed_out";
  createdAt: Date;
  updatedAt: Date;
  processingStartedAt?: Date | null;
}

const TaskSchema = new Schema<ITask>(
  {
    pullRequestId: { type: Number, required: true },
    pullRequestUrl: { type: String, required: true },
    repositoryOwner: { type: String, required: true },
    repositoryName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "timed_out"],
      default: "pending",
      index: true,
    },
    processingStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", TaskSchema);
