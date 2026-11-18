import { isTest } from '../config/env.js';
import { processDueAutoAssignments } from './taskService.js';

let intervalTimer = null;
const POLL_INTERVAL_MS = 10_000; // Poll every 10 seconds

export const flushAutoAssignments = async () => {
  try {
    await processDueAutoAssignments();
  } catch (err) {
    console.error('[AutoAssignWorker] Error processing due assignments:', err.message);
  }
};

export const startAutoAssignWorker = () => {
  if (isTest || intervalTimer) return;
  intervalTimer = setInterval(flushAutoAssignments, POLL_INTERVAL_MS);
  intervalTimer.unref?.();
  // Check immediately on startup
  flushAutoAssignments();
};

export const stopAutoAssignWorker = () => {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
};

export const scheduleTimeoutCheck = (delayMs) => {
  if (isTest) return;
  if (delayMs > 0 && delayMs <= 3600_000) {
    setTimeout(flushAutoAssignments, delayMs + 500).unref?.();
  }
};
