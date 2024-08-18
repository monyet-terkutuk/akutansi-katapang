const express = require('express');
const router = express.Router();
const Product = require('../model/product'); // Ensure path is correct according to your project structure
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create product
router.post(
  '',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const productSchema = {
      title: { type: 'string', min: 5, max: 100, empty: false },
      description: { type: 'string', optional: true },
      images: { type: 'array', items: 'string', optional: true },
      category: { type: 'string', empty: false },
      stock: { type: 'number', min: 0, optional: true },
      price: { type: 'number', empty: false },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, productSchema);

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
      // Create new product
      const product = await Product.create(body);
      return res.status(201).json({
        code: 201,
        status: 'success',
        data: product,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get products
router.get(
  '/list',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find()
        .sort({ createdAt: -1 })
        .populate('category')
        .populate({
          path: 'comment',
          select: ['message', 'name'],
        });

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get single product
router.get(
  '/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('category')
        .populate({
          path: 'comment',
          select: ['message', 'name'],
        });

      if (!product) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Product not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: product,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update product
router.put(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const productSchema = {
      title: { type: 'string', min: 5, max: 100, optional: true },
      description: { type: 'string', optional: true },
      images: { type: 'array', items: 'string', optional: true },
      category: { type: 'string', optional: true },
      stock: { type: 'number', min: 0, optional: true },
      price: { type: 'number', optional: true },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, productSchema);

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
      const product = await Product.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
      });

      if (!product) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Product not found',
        });
      }

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: product,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete product
router.delete(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Product not found',
        });
      }

      await Product.findByIdAndDelete(req.params.id);

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Product deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
