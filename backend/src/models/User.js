const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    profileImage: { type: String },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

module.exports = mongoose.model("User", userSchema);
