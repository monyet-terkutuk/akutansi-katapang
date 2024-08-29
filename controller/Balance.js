const express = require('express');
const router = express.Router();
const Journal = require('../model/Journal'); // Ensure the path is correct
const Account = require('../model/Account'); // Ensure the path is correct
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');

const ExcelJS = require('exceljs');

// pendapatan-beban Excel export with styling
router.get(
  '/export-pendapatan-beban',
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
                  _id: '$journal_date', // Group by journal date
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
            journal_summary: 1, // Include the journal summary with date
            totalDebit: { $ifNull: [{ $sum: '$journal_summary.totalDebit' }, 0] },
            totalCredit: { $ifNull: [{ $sum: '$journal_summary.totalCredit' }, 0] },
            total: { 
              $subtract: [
                { $sum: '$journal_summary.totalDebit' }, 
                { $sum: '$journal_summary.totalCredit' }
              ] 
            },
          },
        },
      ]);

      let totalPendapatan = 0;
      let totalBeban = 0;

      const pendapatan = [];
      const beban = [];

      accountsPendapatanBeban.forEach((account) => {
        if (account.account_type === 4) {
          pendapatan.push(account);
          totalPendapatan += account.total;
        } else if (account.account_type === 5) {
          beban.push(account);
          totalBeban += account.total;
        }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Pendapatan & Beban');

      // Add styles for titles and totals
      const titleStyle = {
        font: { bold: true },
        alignment: { vertical: 'middle', horizontal: 'center' },
        // fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } }, // Light gray background
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f1235' } }, // Light gray background
      };
      
      const headerStyle = {
        font: { bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ff6e6c4' } }, // Light gray background
        alignment: { vertical: 'middle', horizontal: 'center' },
      };

      const totalStyle = {
        font: { bold: true },
        // fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } }, // Darker gray background
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1f1235' } }, // Light gray background
        alignment: { vertical: 'middle', horizontal: 'right' },
      };

      const totalStyleSummary = {
        font: { bold: true },
        // fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } }, // Darker gray background
        alignment: { vertical: 'middle', horizontal: 'right' },
      };

      // Add Pendapatan section
      // let row = worksheet.addRow(['Pendapatan']);
      // row.font = { bold: true };
      // row.eachCell(cell => cell.style = titleStyle);
      worksheet.addRow(['Nama Akun', 'Tipe Akun', 'REF', 'Debit', 'Kredit', 'Jumlah']).eachCell(cell => cell.style = headerStyle);

      pendapatan.forEach(account => {
        worksheet.addRow([
          account.name,
          'Pendapatan',
          account.account_code,
          account.totalDebit,
          account.totalCredit,
          account.total,
        ]);
      });

      // Add Total Pendapatan
      worksheet.addRow([]);
      row = worksheet.addRow(['Total Pendapatan', '', '', '', '', totalPendapatan]);
      row.eachCell(cell => cell.style = totalStyle);

      // Add Beban section
      worksheet.addRow([]);
      row = worksheet.addRow(['']);
      row.font = { bold: true };
      // row.eachCell(cell => cell.style = titleStyle);
      worksheet.addRow(['Nama Akun', 'Tipe Akun', 'REF', 'Debit', 'Kredit', 'Jumlah']).eachCell(cell => cell.style = headerStyle);

      beban.forEach(account => {
        worksheet.addRow([
          account.name,
          'Beban',
          account.account_code,
          account.totalDebit,
          account.totalCredit,
          account.total,
        ]);
      });

      // Add Total Beban
      worksheet.addRow([]);
      row = worksheet.addRow(['Total Beban', '', '', '', '', totalBeban]);
      row.eachCell(cell => cell.style = totalStyle);

      // Add Laba Bersih (Net Profit)
      const labaBersih = totalPendapatan - totalBeban;
      worksheet.addRow([]);
      row = worksheet.addRow(['Laba Bersih (Net Profit)', '', '', '', '', labaBersih]);
      row.eachCell(cell => cell.style = totalStyleSummary);

      // Format currency cells
      ['D', 'E', 'F'].forEach(column => {
        worksheet.getColumn(column).numFmt = '"Rp "#,##0.00;[Red]-"Rp "#,##0.00';
      });

      // Set the response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Pendapatan-Beban.xlsx'
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Export the total balance to Excel
router.get(
  '/export-neraca',
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

      const accountsWithTotals = await Account.aggregate([
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
                    journal_date: { 
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $group: {
                  _id: null, // We only care about the totals
                  totalDebit: { $sum: '$detail.debit' },
                  totalCredit: { $sum: '$detail.credit' },
                },
              },
            ],
            as: 'journal_summary',
          },
        },
        {
          $unwind: '$journal_summary', // Unwind to flatten the structure
        },
        {
          $addFields: {
            total: { $subtract: ['$journal_summary.totalDebit', '$journal_summary.totalCredit'] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            account_type: 1,
            totalDebit: '$journal_summary.totalDebit',
            totalCredit: '$journal_summary.totalCredit',
            total: 1, // Include the total in the output
          },
        },
      ]);

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Total Balance');

      // Define the columns
      worksheet.columns = [
        { header: 'NAMA AKUN', key: 'name', width: 30 },
        { header: 'TIPE AKUN', key: 'account_type', width: 15 },
        { header: 'REF', key: 'account_code', width: 10 },
        { header: 'DEBIT', key: 'totalDebit', width: 15 },
        { header: 'KREDIT', key: 'totalCredit', width: 15 },
        { header: 'TOTAL', key: 'total', width: 15 },
      ];

      // Add rows to the worksheet
      accountsWithTotals.forEach(account => {
        worksheet.addRow({
          name: account.name,
          account_type: account.account_type, // Make sure to convert or format this if needed
          account_code: account.account_code,
          totalDebit: account.totalDebit,
          totalCredit: account.totalCredit,
          total: account.total,
        });
      });

      // Format currency cells
      ['D', 'E', 'F'].forEach(column => {
        worksheet.getColumn(column).numFmt = '"Rp "#,##0.00;[Red]-"Rp "#,##0.00';
      });


      ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
        worksheet.getCell(cell).font = {
          name: 'Arial',
          family: 2,
          size: 10,
          italic: false,
          bold: true,
         };

         worksheet.getCell(cell).alignment = { vertical: 'center', horizontal: 'center' };
      });

      // Set the response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Total-Balance.xlsx'
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  '/export-buku-besar',
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
                    journal_date: { 
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $project: {
                  _id: 0,
                  debit: '$detail.debit',
                  credit: '$detail.credit',
                  note: '$detail.note',
                  journal_date: 1,
                },
              },
            ],
            as: 'journal_details',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            account_type: 1,
            journal_details: 1,
          },
        },
      ]);

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Buku Besar');

      // Set the headers
      worksheet.columns = [
        { header: 'TANGGAL', key: 'journal_date', width: 15 },
        { header: 'NAMA AKUN', key: 'name', width: 25 },
        { header: 'DEBIT', key: 'debit', width: 15 },
        { header: 'KREDIT', key: 'credit', width: 15 },
        { header: 'SALDO DEBIT', key: 'saldo_debit', width: 20 },
        { header: 'SALDO KREDIT', key: 'saldo_kredit', width: 20 },
        { header: 'TOTAL', key: 'total', width: 20 },
      ];

      // Iterate through the accounts and journal details to fill the rows
      accountsWithJournals.forEach((account) => {
        let saldoDebit = 0;
        let saldoKredit = 0;

        account.journal_details.forEach((detail) => {
          saldoDebit += detail.debit || 0;
          saldoKredit += detail.credit || 0;

          worksheet.addRow({
            journal_date: detail.journal_date.toISOString().split('T')[0],
            name: account.name,
            debit: detail.debit || 0,
            credit: detail.credit || 0,
            saldo_debit: saldoDebit,
            saldo_kredit: saldoKredit,
            total: saldoDebit - saldoKredit,
          });
        });
      });

      // Write the Excel file to the response
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename=buku_besar.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

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

      const accountsWithTotals = await Account.aggregate([
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
                    journal_date: { 
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $group: {
                  _id: null, // We only care about the totals
                  totalDebit: { $sum: '$detail.debit' },
                  totalCredit: { $sum: '$detail.credit' },
                },
              },
            ],
            as: 'journal_summary',
          },
        },
        {
          $unwind: '$journal_summary', // Unwind to flatten the structure
        },
        {
          $addFields: {
            total: { $subtract: ['$journal_summary.totalDebit', '$journal_summary.totalCredit'] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            account_type: 1,
            totalDebit: '$journal_summary.totalDebit',
            totalCredit: '$journal_summary.totalCredit',
            total: 1, // Include the total in the output
          },
        },
      ]);

      return res.status(200).json({
        code: 200,
        status: 'success',
        data: accountsWithTotals,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// pendapatan-beban
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
                  _id: '$journal_date', // Group by journal date
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
            journal_summary: 1, // Include the journal summary with date
            totalDebit: { $ifNull: [{ $sum: '$journal_summary.totalDebit' }, 0] },
            totalCredit: { $ifNull: [{ $sum: '$journal_summary.totalCredit' }, 0] },
            total: { 
              $subtract: [
                { $sum: '$journal_summary.totalDebit' }, 
                { $sum: '$journal_summary.totalCredit' }
              ] 
            },
          },
        },
      ]);

      let totalPendapatan = 0;
      let totalBeban = 0;

      const pendapatan = [];
      const beban = [];

      accountsPendapatanBeban.forEach((account) => {
        if (account.account_type === 4) {
          pendapatan.push(account);
          totalPendapatan += account.total;
        } else if (account.account_type === 5) {
          beban.push(account);
          totalBeban += account.total;
        }
      });

      const response = {
        pendapatan,
        beban,
        totalPendapatan,
        totalBeban,
        labaBersih: totalPendapatan - totalBeban,
      };

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


router.get(
  '/export-buku-besar/:accountCode',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const { accountCode } = req.params; // Ambil accountCode dari URL parameters

      // Helper function to convert MM/DD/YYYY to YYYY-MM-DD
      const convertDateFormat = (dateStr) => {
        if (!dateStr) return null;
        const [month, day, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      // Convert the date formats
      const start = convertDateFormat(startDate);
      const end = convertDateFormat(endDate);

      // Buat filter untuk account_code jika diberikan
      const accountFilter = accountCode ? { account_code: parseInt(accountCode) } : {};

      const accountsWithJournals = await Account.aggregate([
        {
          $match: accountFilter // Filter berdasarkan kode akun jika diberikan
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
                    journal_date: {
                      $gte: new Date(start),
                      $lte: new Date(end),
                    }
                  } : {})
                },
              },
              {
                $sort: { journal_date: 1 }, // Sort by date
              },
              {
                $project: {
                  _id: 0,
                  journal_date: 1,
                  name: 1,
                  debit: '$detail.debit',
                  credit: '$detail.credit',
                  note: '$detail.note',
                },
              },
            ],
            as: 'journal_details',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            account_code: 1,
            journal_details: 1,
          },
        },
      ]);

      // Create a new Excel Workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'YourApp';
      workbook.created = new Date();

      accountsWithJournals.forEach(account => {
        const sheet = workbook.addWorksheet(`${account.name.toUpperCase()} (${account.account_code})`);
      
        // Add Header Row
        sheet.addRow(['TANGGAL', 'NAMA AKUN', 'DEBIT', 'KREDIT', 'SALDO DEBIT', 'SALDO KREDIT', 'TOTAL']);
      
        let saldoDebit = 0;
        let saldoKredit = 0;
        let total = 0;
      
        if (account.journal_details.length > 0) {
          account.journal_details.forEach(detail => {
            saldoDebit += detail.debit || 0;
            saldoKredit += detail.credit || 0;
            total = saldoDebit - saldoKredit;
      
            sheet.addRow([
              detail.journal_date.toLocaleDateString(),
              account.name,
              detail.debit || '',
              detail.credit || '',
              saldoDebit || '',
              saldoKredit || '',
              total
            ]);
          });
        } else {
          // Jika tidak ada jurnal terkait, tambahkan baris kosong dengan nama akun
          sheet.addRow(['-', account.name, '-', '-', '-', '-', '-']);
        }
      });
      

      // Write the workbook to a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set headers for download
      res.setHeader('Content-Disposition', 'attachment; filename="Buku-Besar.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
