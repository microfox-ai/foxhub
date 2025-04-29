import mongoose from "mongoose";
import { Task, ITask } from "../models/task.model.js";
import { Subtask, ISubtask, SubtaskStatus } from "../models/subtask.model.js";

// --- Configuration ---
const TASK_TIME_LIMIT_MS = 8 * 60 * 1000; // 8 minutes
const WORKER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// --- Placeholder Subtask Execution Logic ---
// Replace this with your actual functions to execute each subtask type
const executeSubtask = async (subtask: ISubtask): Promise<void> => {
  console.log(
    ` > Executing subtask ${subtask.name} (ID: ${subtask._id}) for Task ${subtask.taskId}`
  );
  // Simulate work based on subtask.name
  switch (subtask.name) {
    case "subtask_1":
      // Simulate some work that might take time
      await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000)); // Simulate 1 minute
      console.log(`   - Subtask ${subtask.name} work done.`);
      break;
    case "subtask_2":
      await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000)); // Simulate 2 minutes
      console.log(`   - Subtask ${subtask.name} work done.`);
      // Simulate a potential failure
      // if (Math.random() > 0.8) {
      //   throw new Error("Random failure in subtask_2");
      // }
      break;
    case "subtask_3":
      await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000)); // Simulate 3 minutes
      console.log(
        `   - Subtask ${subtask.name} work done. Data:`,
        subtask.data
      );
      break;
    default:
      console.warn(`   - Unknown subtask name: ${subtask.name}`);
      // Mark as failed or completed depending on desired behavior
      throw new Error(`Unknown subtask: ${subtask.name}`);
  }
  // If the subtask logic completes without throwing an error, it's considered successful
};
// ---------------------------------------------

const processSingleTask = async (): Promise<boolean> => {
  let taskProcessed = false;
  const task = await Task.findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "processing", processingStartedAt: new Date() } },
    { sort: { createdAt: 1 }, new: true } // Get the oldest pending task
  ).exec();

  if (!task) {
    // console.log("No pending tasks found.");
    return false; // No pending tasks
  }

  console.log(`Processing Task ${task._id} for PR #${task.pullRequestId}`);
  taskProcessed = true;
  const startTime = task.processingStartedAt!.getTime(); // Assured to be set by findOneAndUpdate

  let allSubtasksCompleted = true;
  let timedOut = false;
  let taskFailed = false;
  let firstError: Error | null = null;

  try {
    const subtasks = await Subtask.find({
      taskId: task._id,
      status: SubtaskStatus.Pending,
    })
      .sort({ createdAt: 1 }) // Process subtasks in creation order
      .exec();

    console.log(
      ` Found ${subtasks.length} pending subtasks for Task ${task._id}`
    );

    for (const subtask of subtasks) {
      const currentTime = Date.now();
      if (currentTime - startTime > TASK_TIME_LIMIT_MS) {
        console.log(
          `Task ${task._id} exceeded time limit (${TASK_TIME_LIMIT_MS / 1000}s). Stopping subtask processing.`
        );
        timedOut = true;
        allSubtasksCompleted = false; // Mark as not fully completed due to timeout
        break; // Exit subtask loop
      }

      console.log(` Starting Subtask ${subtask.name} (ID: ${subtask._id})`);
      subtask.status = SubtaskStatus.Processing;
      subtask.attempts += 1;
      subtask.lastAttemptedAt = new Date();
      await subtask.save();

      try {
        await executeSubtask(subtask);
        subtask.status = SubtaskStatus.Completed;
        subtask.completedAt = new Date();
        subtask.error = null;
        console.log(
          ` Subtask ${subtask.name} (ID: ${subtask._id}) completed successfully.`
        );
      } catch (error: any) {
        console.error(
          `Error executing Subtask ${subtask.name} (ID: ${subtask._id}):`,
          error.message
        );
        subtask.status = SubtaskStatus.Failed;
        subtask.error = error.message || "Unknown execution error";
        // Decide task fate based on subtask failure
        taskFailed = true; // Example: fail entire task if one subtask fails
        allSubtasksCompleted = false;
        if (!firstError) firstError = error;
        // break; // Optional: Stop processing further subtasks on first failure
      } finally {
        await subtask.save();
      }
      if (taskFailed) {
        // break; // Optional: Stop processing if a subtask failed and we decided to fail the whole task
      }
    }

    // After loop check if all were actually processed and completed (if not timed out or failed)
    if (!timedOut && !taskFailed) {
      const pendingOrProcessingCount = await Subtask.countDocuments({
        taskId: task._id,
        status: { $in: [SubtaskStatus.Pending, SubtaskStatus.Processing] },
      });
      allSubtasksCompleted = pendingOrProcessingCount === 0;
    } else {
      allSubtasksCompleted = false; // Ensure it's false if timed out or failed
    }
  } catch (error: any) {
    console.error(
      `Unexpected error processing subtasks for Task ${task._id}:`,
      error
    );
    taskFailed = true; // Mark task as failed due to unexpected error during processing
    allSubtasksCompleted = false;
    firstError = error;
  } finally {
    // Finalize task status
    if (timedOut) {
      task.status = "timed_out"; // Specific status for timeout
      console.log(`Task ${task._id} marked as timed_out.`);
    } else if (taskFailed) {
      task.status = "failed";
      console.log(
        `Task ${task._id} marked as failed. First error: ${firstError?.message}`
      );
      // Optionally add more error details to the task document itself
    } else if (allSubtasksCompleted) {
      task.status = "completed";
      console.log(`Task ${task._id} marked as completed.`);
    } else {
      // If not timed out, not failed, but not all subtasks completed (e.g., worker stopped gracefully?),
      // revert to pending to be picked up again. Or introduce a different state.
      task.status = "pending";
      task.processingStartedAt = null; // Reset start time
      console.log(
        `Task ${task._id} did not complete all subtasks. Reverting to pending.`
      );
    }
    task.processingStartedAt = null; // Clear processing start time unless you want to track total time across multiple runs
    await task.save();
  }
  return taskProcessed;
};

// --- Worker Loop ---
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

export const startTaskWorker = () => {
  if (intervalId) {
    console.log("Task worker already running.");
    return;
  }
  console.log(
    `Starting task worker. Interval: ${WORKER_INTERVAL_MS / 1000}s, Task Time Limit: ${TASK_TIME_LIMIT_MS / 1000}s`
  );

  const runWorker = async () => {
    if (isRunning) {
      console.log("Worker cycle skipped: Previous cycle still running.");
      return;
    }
    isRunning = true;
    console.log(`Worker cycle started at ${new Date().toISOString()}`);
    try {
      await processSingleTask();
    } catch (error) {
      console.error("Critical error in worker loop:", error);
      // Consider adding monitoring/alerting here
    } finally {
      isRunning = false;
      console.log(`Worker cycle finished at ${new Date().toISOString()}`);
    }
  };

  // Run immediately first time, then set interval
  runWorker();
  intervalId = setInterval(runWorker, WORKER_INTERVAL_MS);

  console.log("Task worker scheduled.");
};

export const stopTaskWorker = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Task worker stopped.");
  } else {
    console.log("Task worker is not running.");
  }
};

// Optional: Graceful shutdown handling
// process.on('SIGINT', stopTaskWorker);
// process.on('SIGTERM', stopTaskWorker);

// --- MongoDB Connection (ensure this is handled in your main app) ---
/*
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gitbot')
  .then(() => {
      console.log('MongoDB connected for worker.');
      startTaskWorker(); // Start worker after successful DB connection
  })
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1); // Exit if DB connection fails
  });
*/
// -------------------------------------------------------------------
