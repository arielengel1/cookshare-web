import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import yaml from "yamljs";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const HTTPS_PORT =  process.env.HTTPS_PORT || 443;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const methodMap: Record<string, string> = { GET: '\x1b[32m', POST: '\x1b[33m', PUT: '\x1b[34m', DELETE: '\x1b[31m' };
  const color = methodMap[req.method] || '\x1b[37m';
  console.log(`\x1b[90m[${new Date().toISOString()}]\x1b[0m ${color}${req.method}\x1b[0m \x1b[36m${req.url}\x1b[0m`);
  next();
});
app.use("/api/uploads", express.static(path.join(__dirname, '..', 'uploads')));

import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import likeRoutes from "./routes/likeRoutes";

// Swagger Setup

const swaggerDocument = yaml.load("./src/swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/posts/:postId/comments", commentRoutes);
app.use("/api/posts/:postId/likes", likeRoutes);

// Static frontend — after API routes so /api/* is not caught
app.use(express.static(path.join(__dirname, "../public")));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/cookshare";
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB!");

    let server: http.Server | https.Server;

    if (process.env.NODE_ENV !== "production") {
      console.log("Running in development mode (HTTP)");
      server = http.createServer(app).listen(port, () => {
        console.log(`HTTP Server running on port: ${port}`);
      });
    } else {
      const options = {
        key: fs.readFileSync("./client-key.pem"),
        cert: fs.readFileSync("./client-cert.pem"),
      };
      server = https.createServer(options, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server running on port: ${HTTPS_PORT}`);
      });
    }

    process.on("SIGTERM", () => {
      server.close(() => process.exit(0));
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
