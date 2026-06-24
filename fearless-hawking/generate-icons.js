import sharp from 'sharp';
import fs from 'fs';

const inputFile = 'public/favicon.svg';

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(inputFile);

    // 192x192
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile('public/pwa-192x192.png');
    console.log('Generated public/pwa-192x192.png');

    // 512x512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile('public/pwa-512x512.png');
    console.log('Generated public/pwa-512x512.png');

    // 512x512 maskable (same image but we declare it maskable in manifest)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile('public/pwa-maskable-512x512.png');
    console.log('Generated public/pwa-maskable-512x512.png');

    // Apple touch icon 180x180
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon-180x180.png');
    console.log('Generated public/apple-touch-icon-180x180.png');

    // OG Image (1200x630)
    // To make it look good, we can put the square icon in the center of a black background
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([
      {
        input: await sharp(svgBuffer).resize(400, 400).toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toFile('public/og-image.png');
    console.log('Generated public/og-image.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
