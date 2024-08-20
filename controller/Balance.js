const express = require('express');
const router = express.Router();
const Journal = require('../model/Journal'); // Ensure the path is correct
const Account = require('../model/Account'); // Ensure the path is correct
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');

// API to get all journals and calculate totals
router.get(
  '/calculate-totals',
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Fetch all journals and populate the account details in the journal detail
      const journals = await Journal.find().populate('detail.account');

      // Create an object to hold the totals for each account
      const accountTotals = {};

      journals.forEach((journal) => {
        journal.detail.forEach((entry) => {
          const accountId = entry.account._id;

          if (!accountTotals[accountId]) {
            accountTotals[accountId] = {
              account_name: entry.account.name,
              account_code: entry.account.account_code,
              account_type: entry.account.account_type,
              debit: 0,
              credit: 0,
              total: 0,
            };
          }

          accountTotals[accountId].debit += entry.debit || 0;
          accountTotals[accountId].credit += entry.credit || 0;
          accountTotals[accountId].total =
            accountTotals[accountId].debit - accountTotals[accountId].credit;
        });
      });

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: accountTotals,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
