const express = require('express');
const router = express.Router();
const Account = require('../models/account'); // Pastikan path benar sesuai struktur proyek Anda
// const { isAuthenticated, isAdmin } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create Account
router.post(
  '',
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const accountSchema = {
      name: { type: 'string', min: 3, empty: false },
      account_code: { type: 'number', integer: true, optional: true },
      account_type: { type: 'number', integer: true, enum: [1, 2, 3, 4, 5, 6, 7, 8], empty: false },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, accountSchema);

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
      // Create new account
      const account = await Account.create(body);
      return res.status(201).json({
        code: 201,
        status: 'success',
        data: {
          id: account._id,
          name: account.name,
          account_code: account.account_code,
          account_type: account.account_type,
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get Accounts
router.get(
  '/list',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const accounts = await Account.find().sort({ createdAt: -1 });
      return res.status(200).json({
        code: 200,
        status: 'success',
        data: accounts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get Account by ID
router.get(
  '/:id',
  catchAsyncErrors(async (req, res, next) => {
    const accountId = req.params.id;

    try {
      // Find account by ID
      const account = await Account.findById(accountId);

      if (!account) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Account not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: account,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update Account
router.put(
  '/:id',
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const accountId = req.params.id;
    const accountSchema = {
      name: { type: 'string', min: 3, empty: false },
      account_code: { type: 'number', integer: true, optional: true },
      account_type: { type: 'number', integer: true, enum: [1, 2, 3, 4, 5, 6, 7, 8], empty: false },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, accountSchema);

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
      // Update account
      const account = await Account.findByIdAndUpdate(accountId, body, { new: true, runValidators: true });

      if (!account) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Account not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: account,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete Account
router.delete(
  '/:id',
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const accountId = req.params.id;

    try {
      // Find account by ID
      const account = await Account.findById(accountId);

      if (!account) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Account not found',
        });
      }

      // Delete account
      await Account.findByIdAndDelete(accountId);

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Account deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
