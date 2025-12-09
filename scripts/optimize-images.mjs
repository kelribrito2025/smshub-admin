#!/usr/bin/env node
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const publicDir = join(process.cwd(), 'client/public');

async function optimizeImage(filePath, targetSize) {
  console.log(`Otimizando: ${filePath}`);
  
  const image = sharp(filePath);
  const metadata = await image.metadata();
  
  // Se a imagem é maior que o tamanho alvo, redimensionar
  if (metadata.width > targetSize || metadata.height > targetSize) {
    await image
      .resize(targetSize, targetSize, { fit: 'inside' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(filePath + '.tmp');
  } else {
    // Apenas otimizar sem redimensionar
    await image
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(filePath + '.tmp');
  }
  
  // Substituir arquivo original
  await import('fs').then(fs => {
    fs.renameSync(filePath + '.tmp', filePath);
  });
  
  const newStat = await stat(filePath);
  console.log(`  ✓ Novo tamanho: ${(newStat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('🖼️  Otimizando imagens...\n');
  
  // Otimizar favicons (tamanhos específicos)
  const favicons = [
    { file: 'favicon-16x16.png', size: 16 },
    { file: 'favicon-32x32.png', size: 32 },
    { file: 'android-chrome-192x192.png', size: 192 },
    { file: 'android-chrome-512x512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'logo-header.png', size: 32 },
  ];
  
  for (const { file, size } of favicons) {
    const filePath = join(publicDir, file);
    try {
      await optimizeImage(filePath, size);
    } catch (error) {
      console.error(`  ✗ Erro ao otimizar ${file}:`, error.message);
    }
  }
  
  console.log('\n✅ Otimização concluída!');
}

main().catch(console.error);
