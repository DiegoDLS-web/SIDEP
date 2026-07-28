import multer from 'multer';

export const uploadExcelMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const nameOk = /\.xlsx$/i.test(file.originalname);
    const mimeOk =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/octet-stream';
    cb(null, nameOk || mimeOk);
  },
});
