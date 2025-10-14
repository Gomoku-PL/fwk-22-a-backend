import User from "../models/user.model.js";

export const deleteUserData = async (req, res) => {
  try {
    const userId =
      req.user?._id ||
      req.user?._id?.toString?.() ||
      req.userId ||
      req.auth?.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid request: not authenticated" });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Your personal data has been deleted.",
    });
  } catch (err) {
    console.error("deleteUserData error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
