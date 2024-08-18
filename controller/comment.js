const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const Comment = require("../model/comment");
const Product = require("../model/product");

// Create comment and update product
router.post(
  "",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const commentSchema = {
        product_id: { type: "string", empty: false },
        message: { type: "string", empty: false },
      };

      const { body } = req;

      // Validate input data
      const validationResponse = v.validate(body, commentSchema);
      if (validationResponse !== true) {
        return res.status(400).json({
          code: 400,
          status: "error",
          data: {
            error: "Validation failed",
            details: validationResponse,
          },
        });
      }

      // Check if user is authenticated
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: "You're not logged in or token expired",
        });
      }

      // Create comment and associate with product
      const { product_id, message } = body;
      const comment = new Comment({ name: user.name, message });

      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({
          code: 404,
          message: "Product not found",
        });
      }

      product.comment.push(comment._id);
      await comment.save();
      await product.save();

      return res.status(201).json({
        code: 201,
        status: "success",
        message: "Comment added",
        idComment: comment._id,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
