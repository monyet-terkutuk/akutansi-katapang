const express = require('express');
const router = express.Router();
const Journal = require('../models/journal'); // Pastikan path benar sesuai struktur proyek Anda
const { isAuthenticated } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create Journal
router.post(
  '',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const journalSchema = {
      name: { type: 'string', min: 3, empty: false },
      image: { type: 'string', optional: true },
      journal_date: { type: 'date', optional: true },
      detail: { type: 'array', items: 'object', min: 1, empty: false },
      data_change: { type: 'boolean', optional: true },
      note: { type: 'string', optional: true },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, journalSchema);

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
      // Create new journal
      const journal = await Journal.create(body);
      return res.status(201).json({
        code: 201,
        status: 'success',
        data: journal,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get Journals
router.get(
  '/list',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const journals = await Journal.find().sort({ createdAt: -1 });
      return res.status(200).json({
        code: 200,
        status: 'success',
        data: journals,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get Journal by ID
router.get(
  '/:id',
  catchAsyncErrors(async (req, res, next) => {
    const journalId = req.params.id;

    try {
      // Find journal by ID
      const journal = await Journal.findById(journalId);

      if (!journal) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Journal not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: journal,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update Journal
router.put(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const journalId = req.params.id;
    const journalSchema = {
      name: { type: 'string', min: 3, empty: false },
      image: { type: 'string', optional: true },
      journal_date: { type: 'date', optional: true },
      detail: { type: 'array', items: 'object', min: 1, empty: false },
      data_change: { type: 'boolean', optional: true },
      note: { type: 'string', optional: true },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, journalSchema);

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
      // Update journal
      const journal = await Journal.findByIdAndUpdate(journalId, body, { new: true, runValidators: true });

      if (!journal) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Journal not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: journal,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete Journal
router.delete(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const journalId = req.params.id;

    try {
      // Find journal by ID
      const journal = await Journal.findById(journalId);

      if (!journal) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Journal not found',
        });
      }

      // Delete journal
      await Journal.findByIdAndDelete(journalId);

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Journal deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
