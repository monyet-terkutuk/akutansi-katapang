const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const Journal = require('../model/Journal'); // Pastikan path benar sesuai struktur proyek Anda
const { isAuthenticated } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Schema untuk validasi input menggunakan Fastest Validator
const journalSchema = {
  name: { type: 'string', min: 3, empty: false },
  image: { type: 'string', optional: true },
  journal_date: {
    type: 'string',
    optional: true,
    custom(value, errors) {
      const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/; // MM/DD/YYYY format
      if (!regex.test(value)) {
        return [{ type: "datePattern", expected: "MM/DD/YYYY", actual: value }];
      }
      return value;
    }
  },  
  detail: { type: 'array', items: 'object', min: 1, empty: false },
  data_change: { type: 'boolean', optional: true },
  note: { type: 'string', optional: true },
};


// Create Journal
router.post(
  '',
//   isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
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
       // Optionally, convert `journal_date` to a desired format before saving
       const [month, day, year] = body.journal_date.split('/');
       body.journal_date = `${year}-${month}-${day}`; // Converts to YYYY-MM-DD format

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

      // Build the query object
      const query = {};

      if (start && end) {
        query.journal_date = {
          $gte: new Date(start),
          $lte: new Date(end),
        };
      }

      // Fetch journals with optional date range filter
      const journals = await Journal.find(query)
        .populate('detail.account')
        .sort({ journal_date: -1 });

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

// Export Journals to Excel
router.get(
  '/export',
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

      // Build the query object
      const query = {};

      if (start && end) {
        query.journal_date = {
          $gte: new Date(start),
          $lte: new Date(end),
        };
      }

      // Fetch journals with optional date range filter
      const journals = await Journal.find(query)
        .populate('detail.account')
        .sort({ journal_date: -1 });

      // Create a new workbook and add a worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Jurnal Umum');

      // Define the headers and their keys
      worksheet.columns = [
        { header: 'No', key: 'No', width: 5 },
        { header: 'Tanggal', key: 'Tanggal', width: 15 },
        { header: 'Nama Jurnal', key: 'Nama_Jurnal', width: 30 },
        { header: 'Keterangan Journal', key: 'Keterangan_Journal', width: 30 },
        { header: 'Nama Akun', key: 'Nama_Akun', width: 20 },
        { header: 'Kredit', key: 'Kredit', width: 15 },
        { header: 'Debit', key: 'Debit', width: 15 },
        { header: 'Keterangan Akun', key: 'Keterangan_Akun', width: 30 },
      ];

      // Set style only for the header row (row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: '404040' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E0E0' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Prepare data and add rows
      journals.forEach((journal, index) => {
        journal.detail.forEach((d, detailIndex) => {
          worksheet.addRow({
            No: detailIndex === 0 ? index + 1 : '', // Hanya tampilkan No pada baris pertama
            Tanggal: detailIndex === 0 ? new Date(journal.journal_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '', // Format Tanggal: 12 March 2024
            Nama_Jurnal: detailIndex === 0 ? journal.name : '', // Hanya tampilkan nama jurnal pada baris pertama
            Keterangan_Journal: detailIndex === 0 ? journal.note || '' : '', // Hanya tampilkan keterangan jurnal pada baris pertama
            Nama_Akun: d.account ? d.account.name : '',
            Kredit: d.credit,
            Debit: d.debit,
            Keterangan_Akun: d.note || '',
          });
        });
      });

      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set header untuk download file
      res.setHeader('Content-Disposition', 'attachment; filename="Laporan Jurnal Umum.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Kirim buffer sebagai response
      res.send(buffer);

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
      // Find journal by ID and populate account_id in detail
      const journal = await Journal.findById(journalId).populate('detail.account');

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

router.delete(
  '/delete-all-journals',
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Delete all journals
      const result = await Journal.deleteMany({});

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: `${result.deletedCount} journals deleted successfully`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update Journal
router.put(
  '/:id',
//   isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const journalId = req.params.id;
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
       // Optionally, convert `journal_date` to a desired format before saving
       const [month, day, year] = body.journal_date.split('/');
       body.journal_date = `${year}-${month}-${day}`; // Converts to YYYY-MM-DD format
       
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
//   isAuthenticated,
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
