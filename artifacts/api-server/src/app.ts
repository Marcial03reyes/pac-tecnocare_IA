import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { existsSync } from "node:fs";
import path from "node:path";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
// API misses must never return the React HTML shell.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// The same Node process serves the production frontend and the assistant API.
// In Replit development, Vite still runs as a separate managed service.
const publicDir = path.resolve(import.meta.dirname, "../../pac-tecnocare/dist/public");
const indexFile = path.join(publicDir, "index.html");
if (existsSync(indexFile)) {
  app.use(express.static(publicDir, { index: false }));
  app.get("/{*path}", (req, res, next) => {
    if (path.extname(req.path) || !req.accepts("html")) return next();
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(indexFile);
  });
} else if (process.env.NODE_ENV === "production") {
  throw new Error("Frontend build missing. Run npm run build before npm start.");
}

export default app;
