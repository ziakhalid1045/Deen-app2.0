import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config for logging
const configPath = path.join(__dirname, 'firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

async function startServer() {
  console.log("Starting server with NODE_ENV:", process.env.NODE_ENV);
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logger helper
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  console.log("Firebase Database ID:", config.firestoreDatabaseId);
  console.log("Env GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

  // API Routes
  app.post("/api/upload", upload.single("file"), (req, res) => {
    console.log("Upload request received:", req.file?.filename);
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        public_id: req.file.filename,
        resource_type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
      });
    } catch (error) {
      console.error("Upload handler error:", error);
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // Serve static files from uploads
  app.use('/uploads', express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/engagement/status", (req, res) => {
    res.json({ isRunning: true });
  });

  app.post("/api/engagement/:action", (req, res) => {
    const { action } = req.params;
    console.log(`Engagement action: ${action}`);
    res.json({ status: "success", action });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected error occurred",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
