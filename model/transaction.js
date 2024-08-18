const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const transactionSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['Belum Dibayar', 'Dibayar', 'Diproses', 'Dikirim', 'Selesai'],
      default: 'Belum Dibayar',
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,

    //   required: function () {
    //     return this.transaction_type === 'online';
    //   },
    },
    payment_document: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    ppn: {
      type: Number,
      required: true,
    },
    grandtotal: {
      type: Number,
      required: true,
    },
    transaction_type: {
      type: String,
      enum: ['online', 'offline'],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = model('Transaction', transactionSchema);
