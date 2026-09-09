const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPngBuffer(width, height) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw Image Data (Cyan colored 4WEIRD icon pixels)
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const offset = 1 + x * 4;
      row[offset] = 0;       // Red: 0
      row[offset + 1] = 242; // Green: 242
      row[offset + 2] = 254; // Blue: 254 (#00f2fe cyan)
      row[offset + 3] = 255; // Alpha: 255
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createIcoBuffer(pngBuf, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 Image

  const dir = Buffer.alloc(16);
  dir[0] = width >= 256 ? 0 : width;
  dir[1] = height >= 256 ? 0 : height;
  dir[2] = 0; // Colors
  dir[3] = 0; // Reserved
  dir.writeUInt16LE(1, 4);  // Color planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32LE(pngBuf.length, 8); // Size
  dir.writeUInt32LE(22, 12); // Offset (6 + 16)

  return Buffer.concat([header, dir, pngBuf]);
}

function createIcnsBuffer(pngBuf) {
  const typeBuf = Buffer.from('ic08', 'ascii'); // 256x256 icon chunk
  const chunkLen = Buffer.alloc(4);
  chunkLen.writeUInt32BE(8 + pngBuf.length, 0);
  const iconChunk = Buffer.concat([typeBuf, chunkLen, pngBuf]);

  const header = Buffer.from('icns', 'ascii');
  const totalLen = Buffer.alloc(4);
  totalLen.writeUInt32BE(8 + iconChunk.length, 0);

  return Buffer.concat([header, totalLen, iconChunk]);
}

const iconsDir = path.join(__dirname, '..', '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const png32 = createPngBuffer(32, 32);
const png128 = createPngBuffer(128, 128);
const png256 = createPngBuffer(256, 256);
const ico = createIcoBuffer(png256, 256, 256);
const icns = createIcnsBuffer(png256);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icns);

console.log('Successfully generated Tauri icons in', iconsDir);
