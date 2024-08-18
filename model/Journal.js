const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const detailSchema = new Schema(
  {
    debit: {
      type: Number,
      required: [true, 'Debit harus diisi'],
    },
    credit: {
      type: Number,
      required: [true, 'Credit harus diisi'],
    },
    account_id: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account harus ada'],
    },
  }
);

const journalSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    journal_date: {
      type: Date,
      default: Date.now,
    },
    detail: [detailSchema],
    data_change: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model('Journal', journalSchema);
