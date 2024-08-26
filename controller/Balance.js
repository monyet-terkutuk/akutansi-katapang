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

// Neraca Saldo
router.get(
  '/total-balance',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      // Helper function to convert MM/DD/YYYY to YYYY-MM-DD
      const convertDateFormat = (dateStr) => {
        if (!dateStr) return null;
        const [month, day, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      // Convert the date formats
      const start = convertDateFormat(startDate);
      const end = convertDateFormat(endDate);

      const accountsWithJournals = await Account.aggregate([
        {
          $lookup: {
            from: 'journals',
            let: { accountId: '$_id' },
            pipeline: [
              {
                $unwind: '$detail',
              },
              {
                $match: {
                  $expr: {
                    $eq: ['$detail.account', '$$accountId'],
                  },
                  ...(start && end ? {
                    journal_date: { // Use 'journal_date' to filter based on journal date
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $group: {
                  _id: null,
                  totalDebit: { $sum: '$detail.debit' },
                  totalCredit: { $sum: '$detail.credit' },
                },
              },
            ],
            as: 'journal_summary',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            account_type: 1,
            totalDebit: { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalDebit', 0] }, 0] },
            totalCredit: { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalCredit', 0] }, 0] },
          },
        },
      ]);

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: accountsWithJournals,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// Laporan Laba Rugi
router.get(
  '/pendapatan-beban',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      // Helper function to convert MM/DD/YYYY to YYYY-MM-DD
      const convertDateFormat = (dateStr) => {
        if (!dateStr) return null;
        const [month, day, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      // Convert the date formats
      const start = convertDateFormat(startDate);
      const end = convertDateFormat(endDate);

      const accountsPendapatanBeban = await Account.aggregate([
        {
          $match: {
            account_type: { $in: [4, 5] }, // Filter only accounts with type 4 or 5
          },
        },
        {
          $lookup: {
            from: 'journals',
            let: { accountId: '$_id' },
            pipeline: [
              {
                $unwind: '$detail',
              },
              {
                $match: {
                  $expr: {
                    $eq: ['$detail.account', '$$accountId'],
                  },
                  ...(start && end ? {
                    journal_date: { // Filter journals by date range if provided
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $group: {
                  _id: null,
                  totalDebit: { $sum: '$detail.debit' },
                  totalCredit: { $sum: '$detail.credit' },
                },
              },
            ],
            as: 'journal_summary',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            account_type: 1,
            totalDebit: { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalDebit', 0] }, 0] },
            totalCredit: { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalCredit', 0] }, 0] },
            total: { 
              $subtract: [
                { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalDebit', 0] }, 0] }, 
                { $ifNull: [{ $arrayElemAt: ['$journal_summary.totalCredit', 0] }, 0] }
              ] 
            },
          },
        },
      ]);

      const response = {
        pendapatan: null,
        beban: null,
      };

      accountsPendapatanBeban.forEach((account) => {
        if (account.account_type === 4) {
          response.pendapatan = account;
        } else if (account.account_type === 5) {
          response.beban = account;
        }
      });

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: response,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
