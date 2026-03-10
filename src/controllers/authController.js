const authService = require("../services/authService");

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await authService.registerUser({ email, password, username });

    res.status(201).json(user);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Registration failed" });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const result = await authService.loginUser(email, password);

    // Set HTTP-only cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ user: result.user });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Login failed" });
  }
};

/**
 * Refresh access token
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Set new access token cookie
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.json({ message: "Token refreshed" });
  } catch (error) {
    res
      .status(error.status || 401)
      .json({ message: error.message || "Token refresh failed" });
  }
};

/**
 * Logout user
 */
const logout = (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    authService.logoutUser(refreshToken);

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out" });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Logout failed" });
  }
};

/**
 * Get user profile
 */
const getProfile = (req, res) => {
  try {
    const user = authService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch profile" });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
};
