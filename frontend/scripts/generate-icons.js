const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\4054c8e9-b08b-4754-9281-48565b61c403\\spendpulse_icon_1791110271852.jpg';
const OUT_DIR = path.join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const size of sizes) {
    const outFile = path.join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(outFile);
    console.log(`✓ Generated ${size}x${size}`);
  }

  // Also copy 512 as apple-touch-icon and favicon
  await sharp(SOURCE).resize(180, 180).png().toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png (180x180)');

  await sharp(SOURCE).resize(32, 32).png().toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');

  await sharp(SOURCE).resize(16, 16).png().toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  console.log('✓ Generated favicon-16x16.png');

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
