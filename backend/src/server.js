const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();
const driverRoutes = require("./routes/driverRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");


function validateEnv() {
  const requiredVars = ["MONGODB_URI", "JWT_SECRET"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}. Server cannot start.`
    );
    process.exit(1);
  }
}

function validateEnv() {
  const requiredVars = ["MONGODB_URI", "JWT_SECRET"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}. Server cannot start.`
    );
    process.exit(1);
  }
}

// DB'ye bağlan
validateEnv();
connectDB();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const tripRoutes = require("./routes/tripRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
