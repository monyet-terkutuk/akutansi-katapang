const express = require('express');
const router = express.Router();
const Category = require('../model/category'); // Ensure path is correct according to your project structure
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create category
router.post(
  '',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const categorySchema = {
      name: { type: 'string', min: 3, empty: false },
      image: { type: 'string', empty: false },
    };

    const { body } = req;

    // Validate input data
    const validationResponse = v.validate(body, categorySchema);

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
      // Create new category
      const category = await Category.create(body);
      return res.status(201).json({
        code: 201,
        status: 'success',
        data: {
          id: category._id,
          name: category.name,
          image: category.image,
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get categories
router.get(
  '/list',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });
      return res.status(200).json({
        code: 200,
        status: 'success',
        data: categories,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete category
router.delete(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const categoryId = req.params.id;

    try {
      // Find category by ID
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Category not found',
        });
      }

      // Delete category
      await Category.findByIdAndDelete(categoryId);

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
