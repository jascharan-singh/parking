const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path"); // Import path for serving static files

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose
  .connect(process.env.DB_CONNECTION_STRING, { autoIndex: true })
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Monitor MongoDB connection events
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

// Configure CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Dynamic origin for deployment
    methods: ["GET", "POST"], // Allow only specific methods
    credentials: true, // Allow credentials (if cookies or auth headers are needed)
  })
);

// Middleware to parse JSON bodies with error handling
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("❌ Invalid JSON received");
    return res.status(400).send({ error: "Invalid JSON format" });
  }
  next();
});

// Import the location model
const Location = require("./models/Location");

// POST endpoint to save a location
app.post("/send-location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate input
    if (latitude == null || longitude == null) {
      console.warn("⚠️ Missing latitude/longitude:", req.body);
      return res.status(400).json({
        error: "Missing required fields",
        received: req.body,
      });
    }

    // Validate coordinate ranges
    if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: "Invalid latitude value",
        received: latitude,
      });
    }
    if (!isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Invalid longitude value",
        received: longitude,
      });
    }

    // Save location to MongoDB
    const newLocation = new Location({ latitude, longitude });
    const savedLocation = await newLocation.save();

    console.log("✅ Location saved successfully:", savedLocation);
    res.status(201).json({
      message: "Location saved successfully",
      location: savedLocation,
    });
  } catch (error) {
    console.error("❌ Error saving location:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// GET endpoint to retrieve locations
app.get("/locations", async (req, res) => {
  try {
    const locations = await Location.find().sort("-createdAt").limit(10);
    console.log(`✅ Fetched ${locations.length} locations`);
    res.status(200).json(locations);
  } catch (error) {
    console.error("❌ Error retrieving locations:", error.message);
    res.status(500).json({
      error: "Error fetching locations",
      message: error.message,
    });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for all unknown routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
const server = app
  .listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  })
  .on("error", (err) => {
    console.error("❌ Server start error:", err.message);
  });

// Graceful shutdown on SIGTERM
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("🛑 Database disconnected");
      process.exit(0);
    });
  });
});

// Global error handling for unexpected exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

// Global error handling for unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});