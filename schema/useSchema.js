import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

export const User = new mongoose.model("user", UserSchema);
