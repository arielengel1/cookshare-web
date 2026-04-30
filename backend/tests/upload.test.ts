import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { upload } from '../src/middleware/upload';

// Create a test express app with the upload middleware
const app = express();

app.post('/test-upload', upload.single('file'), (req: Request, res: Response) => {
  res.json({
    filename: req.file?.filename,
    destination: req.file?.destination,
    mimetype: req.file?.mimetype,
  });
});

// Error handler to catch multer errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ message: err.message });
});

describe('Upload Middleware', () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  afterAll(() => {
    // Clean up test files from uploads directory
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.startsWith('test-') || file.includes('test.png') || file.includes('test.pdf')) {
          try { fs.unlinkSync(path.join(uploadsDir, file)); } catch {}
        }
      }
    }
  });

  it('should accept image files (image/png)', async () => {
    // Minimal 1x1 PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAxJREFUCNdjYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/test-upload')
      .attach('file', pngBuffer, 'test.png');
    expect(res.status).toBe(200);
    expect(res.body.filename).toMatch(/^\d+-test\.png$/);
    expect(res.body.mimetype).toBe('image/png');
  });

  it('should accept image files (image/jpeg)', async () => {
    // Minimal JPEG (JFIF header)
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
    ]);

    const res = await request(app)
      .post('/test-upload')
      .attach('file', jpegBuffer, 'test.jpg');
    expect(res.status).toBe(200);
    expect(res.body.filename).toMatch(/^\d+-test\.jpg$/);
  });

  it('should reject non-image files', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 test content');

    const res = await request(app)
      .post('/test-upload')
      .attach('file', pdfBuffer, 'test.pdf');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Only images are allowed');
  });

  it('should store files in the uploads directory', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAxJREFUCNdjYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/test-upload')
      .attach('file', pngBuffer, 'test.png');
    expect(res.status).toBe(200);
    expect(res.body.destination).toBe(uploadsDir);

    // Verify file actually exists
    const filePath = path.join(uploadsDir, res.body.filename);
    expect(fs.existsSync(filePath)).toBe(true);

    // Clean up
    fs.unlinkSync(filePath);
  });

  it('should verify uploads directory exists', () => {
    expect(fs.existsSync(uploadsDir)).toBe(true);
  });

  it('should create uploads directory if it does not exist', () => {
    const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => '' as any);
    const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    jest.isolateModules(() => {
      require('../src/middleware/upload');
    });

    expect(mkdirSyncSpy).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true });
    mkdirSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
  });
});

