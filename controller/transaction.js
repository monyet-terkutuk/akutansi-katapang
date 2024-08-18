const express = require('express');
const router = express.Router();
const Transaction = require('../model/transaction');
const Product = require('../model/product');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create transaction
router.post(
  '/create',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const transactionSchema = {
      status: { type: 'string', enum: ['Belum Dibayar', 'Dibayar', 'Diproses', 'Dikirim', 'Selesai'], default: 'Belum Dibayar', optional: true },
      product: { type: 'string', empty: false },
      user: { type: 'string', optional: true },
      payment_document: { type: 'string', optional: true },
      quantity: { type: 'number', min: 1, empty: false },
      transaction_type: { type: 'string', enum: ['online', 'offline'], empty: false },
    };

    const { body } = req;

    // Validation input data
    const validationResponse = v.validate(body, transactionSchema);

    if (validationResponse !== true) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        data: {
          error: 'Validation failed',
          details: validationResponse,
        },
      });
    }

    try {
      const product = await Product.findById(body.product);
      if (!product) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          data: { error: 'Product not found' },
        });
      }

      if (product.stock < body.quantity) {
        return res.status(400).json({
          code: 400,
          status: 'error',
          data: { error: 'Insufficient stock' },
        });
      }

      const subtotal = product.price * body.quantity;
      const ppn = subtotal * 0.11;
      const grandtotal = subtotal + ppn;

      const transaction = await Transaction.create({
        ...body,
        subtotal,
        ppn,
        grandtotal,
      });

      // Update product stock
      product.stock -= body.quantity;
      await product.save();

      // Populate product
      const populatedTransaction = await Transaction.findById(transaction._id).populate('product');

      return res.json({
        code: 200,
        status: 'success',
        data: populatedTransaction,
      });
    } catch (error) {
      return res.status(500).json({
        code: 500,
        status: 'error',
        data: error.message,
      });
    }
  })
);

// Get all transactions
router.get(
  '/list',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const transactions = await Transaction.find()
        .populate('product')
        .populate('user')
        .sort({ createdAt: -1 });

      // Format values
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction._doc,
        subtotal: formatCurrency(transaction.subtotal),
        ppn: formatCurrency(transaction.ppn),
        grandtotal: formatCurrency(transaction.grandtotal),
      }));

      res.status(200).json({
        meta: {
          message: 'Transactions retrieved successfully',
          code: 200,
          status: 'success',
        },
        data: formattedTransactions,
      });
    } catch (error) {
      console.error('Error:', error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get transaction by ID
router.get(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const transaction = await Transaction.findById(req.params.id)
        .populate('product')
        .populate('user');

      if (!transaction) {
        return res.status(404).json({
          code: 404,
          message: 'Transaction not found',
          data: null,
        });
      }

      res.status(200).json({
        code: 200,
        message: 'Transaction retrieved successfully',
        data: transaction,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get transactions by user ID
router.get(
  '/user/:userId',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const transactions = await Transaction.find({ user: req.params.userId })
        .populate('product')
        .populate('user')
        .sort({ createdAt: -1 });

      if (!transactions.length) {
        return res.status(404).json({
          code: 404,
          message: 'No transactions found for this user',
          data: null,
        });
      }

      res.status(200).json({
        code: 200,
        message: 'Transactions retrieved successfully',
        data: transactions,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update transaction
router.put(
  '/update/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const transactionSchema = {
      status: { type: 'string', enum: ['Belum Dibayar', 'Dibayar', 'Diproses', 'Dikirim', 'Selesai'], optional: true },
      product: { type: 'string', optional: true },
      user: { type: 'string', optional: true },
      payment_document: { type: 'string', optional: true },
      quantity: { type: 'number', min: 1, optional: true },
      transaction_type: { type: 'string', enum: ['online', 'offline'], optional: true },
    };

    const { body } = req;

    // validation input data
    const validationResponse = v.validate(body, transactionSchema);

    if (validationResponse !== true) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        data: {
          error: 'Validation failed',
          details: validationResponse,
        },
      });
    }

    try {
      const transaction = await Transaction.findById(req.params.id);
      if (!transaction) {
        return res.status(404).json({
          code: 404,
          message: 'Transaction not found',
          data: null,
        });
      }

      if (body.product) {
        const product = await Product.findById(body.product);
        if (!product) {
          return res.status(404).json({
            code: 404,
            status: 'error',
            data: { error: 'Product not found' },
          });
        }

        transaction.subtotal = product.price * (body.quantity || transaction.quantity);
        transaction.ppn = transaction.subtotal * 0.11;
        transaction.grandtotal = transaction.subtotal + transaction.ppn;
      }

      Object.assign(transaction, body);

      await transaction.save();

      res.status(200).json({
        code: 200,
        message: 'Transaction updated successfully',
        data: transaction,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete transaction
router.delete(
  '/delete/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const transaction = await Transaction.findByIdAndDelete(req.params.id);

      if (!transaction) {
        return res.status(404).json({
          code: 404,
          message: 'Transaction not found',
          data: null,
        });
      }

      res.status(200).json({
        code: 200,
        message: 'Transaction deleted successfully',
        data: null,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

function formatCurrency(amount) {
  if (isNaN(amount)) return 'Rp 0';
  return `${amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`;
}

module.exports = router;
