const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads/application-attachments');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'app-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const ALLOWED_EXT = /pdf|doc|docx|jpeg|jpg|png|zip/;
const ALLOWED_MIME =
    /pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|jpeg|jpg|png|zip|x-zip-compressed|octet-stream/;

const fileFilter = (req, file, cb) => {
    const extOk = ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = ALLOWED_MIME.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, JPG, PNG, or ZIP files are allowed'));
};

const uploadApplicationAttachment = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

module.exports = uploadApplicationAttachment;
