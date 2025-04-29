import mongoose from "mongoose";

const githubEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  repository: {
    name: String,
    owner: String,
    fullName: String,
  },
  sender: {
    login: String,
    id: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const GitHubEvent = mongoose.model("GitHubEvent", githubEventSchema);
