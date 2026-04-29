const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const cartRoutes = require("./routes/cart.routes");

const errorMiddleware = require("./middleware/error.middleware");
const notFoundMiddleware = require("./middleware/notFound.middleware");

const app = express();
const normalizeOrigin = (value) => String(value || "").replace(/\/+$/, "");
const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

// Dev ortamında Vite bazen portu otomatik değiştiriyor (5173 -> 5174 gibi).
// Bu yüzden localhost/127.0.0.1 portlarını esnek izinliyoruz.
const isLocalhostOrigin = (normalizedOrigin) => {
  const localhostRe = /^http:\/\/localhost:\d+$/;
  const loopbackRe = /^http:\/\/127\.0\.0\.1:\d+$/;
  const androidEmulatorRe = /^http:\/\/10\.0\.2\.2:\d+$/;
  const lanRe = /^http:\/\/(?:192\.168|10\.\d+|172\.(?:1[6-9]|2\d|3[0-1]))\.\d+\.\d+:\d+$/;
  return (
    localhostRe.test(normalizedOrigin) ||
    loopbackRe.test(normalizedOrigin) ||
    androidEmulatorRe.test(normalizedOrigin) ||
    lanRe.test(normalizedOrigin)
  );
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized) || isLocalhostOrigin(normalized)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: origin not allowed"));
    },
  })
);
// Mobilde base64 profil fotografi guncellemesi varsayilan 100kb limiti asabiliyor.
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;