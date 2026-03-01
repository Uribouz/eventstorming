import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to retry database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  throw lastError;
}

// Health check endpoint
app.get("/make-server-a79a26d0/health", (c) => {
  return c.json({ status: "ok" });
});

// Get the entire board state
app.get("/make-server-a79a26d0/board", async (c) => {
  try {
    const boardState = await retryOperation(() => kv.get("event-storming-board"));
    if (!boardState) {
      return c.json({
        notes: [],
        lines: [],
        arrows: [],
        contexts: [],
      });
    }
    return c.json(boardState);
  } catch (error) {
    console.error("Error fetching board state after retries:", error);
    // Return empty board instead of error to allow app to continue
    return c.json({
      notes: [],
      lines: [],
      arrows: [],
      contexts: [],
    });
  }
});

// Save the entire board state
app.post("/make-server-a79a26d0/board", async (c) => {
  try {
    const body = await c.req.json();
    await retryOperation(() => kv.set("event-storming-board", body));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving board state after retries:", error);
    return c.json({ error: "Failed to save board state", details: error.message }, 503);
  }
});

// Get the last update timestamp (for polling)
app.get("/make-server-a79a26d0/board/timestamp", async (c) => {
  try {
    const timestamp = await retryOperation(() => kv.get("event-storming-board-timestamp"));
    return c.json({ timestamp: timestamp || 0 });
  } catch (error) {
    console.error("Error fetching timestamp after retries:", error);
    // Return 0 timestamp to allow polling to continue
    return c.json({ timestamp: 0 });
  }
});

// Update timestamp whenever board is updated
app.post("/make-server-a79a26d0/board/update", async (c) => {
  try {
    const body = await c.req.json();
    const timestamp = Date.now();
    
    // Try to save both with retries
    await retryOperation(async () => {
      await kv.set("event-storming-board", body);
      await kv.set("event-storming-board-timestamp", timestamp);
    });
    
    return c.json({ success: true, timestamp });
  } catch (error) {
    console.error("Error updating board state after retries:", error);
    return c.json({ error: "Failed to update board state", details: error.message }, 503);
  }
});

Deno.serve(app.fetch);