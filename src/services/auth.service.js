const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");

const prisma = new PrismaClient();

async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("Bu e-posta adresi zaten kayıtlı");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "CUSTOMER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImageDataUrl: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user,
    token,
  };
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error("Geçersiz e-posta veya şifre");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Geçersiz e-posta veya şifre");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      profileImageDataUrl: user.profileImageDataUrl || null,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImageDataUrl: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error("Kullanıcı bulunamadı");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function updateCurrentUser(userId, payload = {}) {
  const phoneRaw = payload.phone;
  const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : "";
  const profileImageDataUrlRaw = payload.profileImageDataUrl;
  const profileImageDataUrl =
    typeof profileImageDataUrlRaw === "string" && profileImageDataUrlRaw.trim()
      ? profileImageDataUrlRaw.trim()
      : null;
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: phone || null,
        profileImageDataUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImageDataUrl: true,
        role: true,
        createdAt: true,
      },
    });
    return updated;
  } catch (error) {
    if (error?.code === "P2025") {
      const notFound = new Error("Kullanıcı bulunamadı");
      notFound.statusCode = 404;
      throw notFound;
    }

    if (error?.code === "P2022") {
      const schemaError = new Error("Profil/telefon alani veritabaninda bulunamadi. Server migration guncellemesi gerekli.");
      schemaError.statusCode = 500;
      throw schemaError;
    }

    const rawMessage = String(error?.message || "");
    if (
      rawMessage.includes("Unknown argument `phone`") ||
      rawMessage.includes("Unknown argument phone") ||
      rawMessage.includes("Unknown argument `profileImageDataUrl`") ||
      rawMessage.includes("Unknown argument profileImageDataUrl")
    ) {
      // Fallback: Prisma client eski dmmf ile calisiyorsa, update islemini raw SQL ile yap.
      await prisma.$executeRaw`
        UPDATE "User"
        SET "phone" = ${phone || null}, "profileImageDataUrl" = ${profileImageDataUrl}
        WHERE "id" = ${userId}
      `;
      const rows = await prisma.$queryRaw`
        SELECT "id", "name", "email", "phone", "profileImageDataUrl", "role", "createdAt"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
      `;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        const notFound = new Error("Kullanıcı bulunamadı");
        notFound.statusCode = 404;
        throw notFound;
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        profileImageDataUrl: row.profileImageDataUrl || null,
        role: row.role,
        createdAt: row.createdAt,
      };
    }

    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
};