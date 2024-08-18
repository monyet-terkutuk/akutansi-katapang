const express = require("express");
const router = express.Router();
const Transaction = require('../model/transaction'); // Import the Transaction model correctly
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

// Get summary dashboard
router.get(
    "/summary",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const transactionCount = await Transaction.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              status: "$_id",
              count: 1,
              _id: 0
            }
          }
        ]);

        const summary = {
          Paid: 0,
          Processed: 0,
          Shipped: 0,
          Success: 0,
          Unpaid: 0
        };

        transactionCount.forEach(item => {
          if (item.status === "Belum Dibayar") summary.Unpaid = item.count;
          if (item.status === "Dibayar") summary.Paid = item.count;
          if (item.status === "Diproses") summary.Processed = item.count;
          if (item.status === "Dikirim") summary.Shipped = item.count;
          if (item.status === "Selesai") summary.Success = item.count;
        });

        res.status(200).json({
          code: 200,
          success: true,
          data: summary,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
);

// Total transactions per month with status "Selesai"
router.get(
  '/total-transactions-per-month',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const currentYear = new Date().getFullYear();

      const transactions = await Transaction.aggregate([
        {
          $match: {
            status: 'Selesai',
            createdAt: {
              $gte: new Date(currentYear, 0, 1),
              $lt: new Date(currentYear + 1, 0, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$grandtotal' },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]);

      // Create an array to hold the results for all 12 months
      const monthlyTransactions = Array.from({ length: 12 }, (_, index) => ({
        year: currentYear,
        month: index + 1,
        totalTransactions: 0,
        totalAmount: 0,
      }));

      // Populate the array with actual transaction data
      transactions.forEach(transaction => {
        const monthIndex = transaction._id.month - 1;
        monthlyTransactions[monthIndex] = {
          year: transaction._id.year,
          month: transaction._id.month,
          totalTransactions: transaction.totalTransactions,
          totalAmount: transaction.totalAmount,
        };
      });

      res.status(200).json({
        code: 200,
        status: 'success',
        data: monthlyTransactions,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
