const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const commentSchema = Schema(
  {
    name: {
      type: String,
    },
    message: {
      type: String,
      required: [true, "pesan harus ada"],
      minlength: 1,
    },
  },
  { timestamps: true }
);

module.exports = model("Comment", commentSchema);
