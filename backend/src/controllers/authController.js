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
        profileImage: user.profileImage,
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
        profileImage: user.profileImage,
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

async function updateProfile(req, res) {
  try {
    const { name, email, profileImage } = req.body;
    const userId = req.user.userId;

    console.log("📝 Profile update request:", {
      userId,
      name,
      email,
      hasProfileImage: !!profileImage,
      imageSize: profileImage?.length
    });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update name
    user.name = name.trim();

    // Update email if provided and different
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      // Check if new email is already taken
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use" });
      }

      user.email = email.toLowerCase();
    }

    // Update profile image if provided
    if (profileImage) {
      console.log("🖼️ Updating profile image, size:", profileImage.length);
      user.profileImage = profileImage;
    }

    await user.save();

    console.log("✅ Profile updated successfully for user:", userId);

    return res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Server error while updating profile" });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Get user with password field
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Check if new password is same as old password
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error while changing password" });
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  devResetPassword,
  updateProfile,
  changePassword,
};
