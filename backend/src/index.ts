import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import messRoutes from "./routes/mess.routes";
import mealRoutes from "./routes/meal.routes";
import bazaarRoutes from "./routes/bazaar.routes";
import paymentRoutes from "./routes/payment.routes";
import reportRoutes from "./routes/report.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ─── Better Auth ──────────────────────────────────────────────────────────────
// Must come before express.json() to handle auth requests properly
app.all("/api/auth/*", toNodeHandler(auth));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/mess", messRoutes);
app.use("/api/meals/:messId", mealRoutes);
app.use("/api/bazaar/:messId", bazaarRoutes);
app.use("/api/payments/:messId", paymentRoutes);
app.use("/api/reports/:messId", reportRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
