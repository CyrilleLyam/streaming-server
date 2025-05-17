import express from 'express';
import path from 'path';
import fs from 'fs';
import { stat, access } from 'fs/promises';
import logger from 'chhlat-logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  res.sendFile(indexPath);
});

app.get('/video', async (req, res) => {
  const range = req.headers.range;
  if (!range) {
    return res.status(400).send('Requires Range header');
  }

  const videoPath = path.join(process.cwd(), 'public', 'shoti.mp4');

  try {
    await access(videoPath);
    const { size: videoSize } = await stat(videoPath);

    const CHUNK_SIZE_KB = 100;
    const CHUNK_SIZE = CHUNK_SIZE_KB * 1024;

    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE - 1, videoSize - 1);

    const contentLength = end - start + 1;

    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };

    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
    logger.info(
      `📼 Streaming ${toMB(contentLength)}MB from ${toMB(start)}MB to ${toMB(
        end,
      )}MB (Total: ${toMB(videoSize)}MB)`,
    );

    res.writeHead(206, headers);
    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } catch (err) {
    logger.error(`❌ Failed to stream video: ${err.message}`);
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  logger.info(`🚀 Video server running at http://localhost:${PORT}`);
});
