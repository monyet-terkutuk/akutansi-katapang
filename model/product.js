const mongoose = require('mongoose');
const { model, Schema } = mongoose;

const productSchema = new Schema(
    {
      title: {
        type: String,
        required: [true, 'judul harus ada'],
        minlength: 5,
        maxlength: 100,
      },
      description: {
        type: String,
      },
      images: [String],
      category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'kategori harus ada'],
      },
      stock: {
        type: Number,
        default: 0,
      },
      price: {
        type: Number,
        required: true,
      },
      comment: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Comment',
        },
      ],
    },
    { timestamps: true },
  );
  
  module.exports = model('Product', productSchema);
  