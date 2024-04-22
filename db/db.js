import mongoose from "mongoose";

export function connectDb() {
  mongoose
    .connect(
      "mongodb+srv://ankit:ankit@cluster0.wt0xt6q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/whiteboard",
    )
    .then(() => {
      console.log("mongoose connected successfully");
    })
    .catch((e) => {
      console.log(e.message);
    });
}
