const path = require('path');
const StoredFile = require('../models/StoredFile');

// Chooses where multer puts uploads. FILE_STORAGE=db stores them in the
// stored_files table (for hosts with an ephemeral disk); anything else keeps the
// existing disk storage, so local development is unchanged.
//
// Either way multer ends up setting `file.filename`, which is all the
// controllers read to build `/uploads/<folder>/<filename>` URLs.
const useDatabase = () => process.env.FILE_STORAGE === 'db';

// Same naming rule the disk storages use: <prefix><timestamp>-<random><ext>.
const uniqueName = (prefix, originalname) =>
    `${prefix}${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname || '').toLowerCase()}`;

// Minimal multer StorageEngine that buffers the upload and writes one row.
const databaseStorage = (folder, prefix) => ({
    _handleFile(req, file, cb) {
        const chunks = [];
        let size = 0;
        file.stream.on('data', (chunk) => {
            chunks.push(chunk);
            size += chunk.length;
        });
        file.stream.on('error', cb);
        file.stream.on('end', async () => {
            try {
                const filename = uniqueName(prefix, file.originalname);
                await StoredFile.create({
                    key: `${folder}/${filename}`,
                    mimeType: file.mimetype || 'application/octet-stream',
                    size,
                    originalName: file.originalname ? String(file.originalname).slice(0, 255) : null,
                    data: Buffer.concat(chunks)
                });
                cb(null, { filename, size });
            } catch (err) {
                cb(err);
            }
        });
    },
    _removeFile(req, file, cb) {
        StoredFile.destroy({ where: { key: `${folder}/${file.filename}` } })
            .then(() => cb(null))
            .catch(cb);
    }
});

const storageFor = (folder, prefix, diskStorage) =>
    useDatabase() ? databaseStorage(folder, prefix) : diskStorage;

// GET /uploads/* — serves a stored file, or falls through to the static disk
// handler (older files, or FILE_STORAGE unset).
const serveStoredFile = async (req, res, next) => {
    try {
        const key = decodeURIComponent(req.path.replace(/^\/+/, ''));
        if (!key || key.includes('..')) return next();
        const file = await StoredFile.findOne({ where: { key } });
        if (!file) return next();
        res.set('Content-Type', file.mimeType);
        res.set('Content-Length', String(file.size));
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('X-Content-Type-Options', 'nosniff');
        // Uploaded SVGs can carry script; sandbox anything opened directly.
        res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
        return res.send(file.data);
    } catch (err) {
        return next(err);
    }
};

module.exports = { storageFor, serveStoredFile, useDatabase, _internal: { uniqueName, databaseStorage } };
