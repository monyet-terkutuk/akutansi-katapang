const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const balanceSchema = new Schema(
  {
    account_name: {
      type: String,
      required: true,
    },
    account_code: {
      type: Number,
    },
    account_type: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8],
      required: true,
    },
    debit: {
      type: Number,
    },
    credit: {
      type: Number,
    },
    total: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = model('Balance', balanceSchema);
