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

function buildResetUrl(token, email) {
  const baseUrl =
    process.env.PASSWORD_RESET_URL ||
    process.env.FRONTEND_URL ||
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

    if (!user) {
      return res.json({
        message:
          "If that email is registered, password reset instructions have been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60;
    await user.save();

    const resetUrl = buildResetUrl(rawToken, user.email);
    const greeting = user.name ? user.name.split(" ")[0] : "Merhaba";

    await sendEmail({
      to: user.email,
      subject: "Şifre sıfırlama talebi",
      text: `${greeting},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı 1 saat içinde kullanın:\n${resetUrl}\n\nEğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.`,
      html: `<p>${greeting},</p><p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı <strong>1 saat</strong> içinde kullanın:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>`,
    });

    return res.json({
      message:
        "If that email is registered, password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res
      .status(500)
      .json({ message: "Unable to process password reset request" });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res
        .status(400)
        .json({ message: "Token, email and new password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

    await sendEmail({
      to: user.email,
      subject: "Şifreniz güncellendi",
      text: `${user.name},\n\nŞifreniz başarıyla güncellendi. Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin.`,
      html: `<p>${user.name},</p><p>Şifreniz başarıyla güncellendi. Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin.</p>`,
    });

    return res.json({ message: "Password has been updated" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Unable to reset password" });
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

// DEV ONLY: Reset password without authentication
async function devResetPassword(req, res) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and newPassword are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isActive = true; // Ensure account is active
    await user.save();

    return res.json({
      message: "Password reset successfully",
      user: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("Dev reset password error:", err);
    return res.status(500).json({ message: "Server error during password reset" });
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
};
