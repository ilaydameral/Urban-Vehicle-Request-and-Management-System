const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { sendEmail } = require("../utils/emailService");

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function register(req, res) {
  try {
    const { name, email, password, role, adminSecret } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const BASIC_ROLES = ["PASSENGER", "DRIVER"];
    const ELEVATED_ROLES = ["COORDINATOR", "ADMIN"];

    let userRole = (role || "PASSENGER").toUpperCase();

    if (ELEVATED_ROLES.includes(userRole)) {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({
          message:
            "You are not allowed to register with this role. Invalid adminSecret.",
        });
      }
    } else if (!BASIC_ROLES.includes(userRole)) {
      userRole = "PASSENGER";
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
    });

    const token = generateToken(user);

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
}

function buildResetUrl(req, token, email) {
  const safeOrigin = (value) => {
    if (!value) return null;
    try {
      return new URL(value).origin;
    } catch (e) {
      return null;
    }
  };

  const headerOrigin = safeOrigin(req?.headers?.origin);
  const headerReferer = safeOrigin(req?.headers?.referer);

  const baseUrl =
    process.env.PASSWORD_RESET_URL ||
    process.env.FRONTEND_URL ||
    headerOrigin ||
    headerReferer ||
    "http://localhost:5173";

  const sanitized = baseUrl.endsWith("/")
    ? baseUrl.slice(0, baseUrl.length - 1)
    : baseUrl;

  const searchParams = new URLSearchParams({ token, email });
  return `${sanitized}/reset-password?${searchParams.toString()}`;
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.isActive === false) {
      return res
        .status(403)
        .json({ message: "Account is disabled. Please contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Güvenlik: kullanıcı yoksa da aynı mesaj dön
    if (!user) {
      return res.json({
        message: "If that email is registered, password reset instructions have been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 saat
    await user.save();

    const resetLink = buildResetUrl(req, rawToken, user.email);

    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      text: `Reset your password using this link: ${resetLink}`,
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    });

    return res.json({
      message: "If that email is registered, password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Unable to process password reset request" });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ message: "Token, email and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error during password reset" });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
};
