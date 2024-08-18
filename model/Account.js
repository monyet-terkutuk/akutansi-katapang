const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const accountSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    account_code: {
      type: Number,
    },
    account_type: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8], // Menggunakan array untuk enum
      required: true, // Menambahkan required jika diperlukan
    },
  },
  { timestamps: true }
);

module.exports = model('Account', accountSchema);
``