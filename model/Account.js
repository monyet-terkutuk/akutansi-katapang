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
      unique: true, // Ensure account_code is unique
    },
    account_type: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8], // Using array for enum
      required: true, // Ensure account_type is required
    },
  },
  { timestamps: true }
);

// Create an index for the account_code to enforce uniqueness
accountSchema.index({ account_code: 1 }, { unique: true });

module.exports = model('Account', accountSchema);
