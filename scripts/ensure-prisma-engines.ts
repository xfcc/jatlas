import fs from 'fs';
import https from 'https';
import path from 'path';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { enginesVersion } from '@prisma/engines-version';

async function download(url: string, destination: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          void download(response.headers.location, destination).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
          response.resume();
          return;
        }

        const tempPath = `${destination}.tmp`;
        const output = fs.createWriteStream(tempPath);
        pipeline(response, zlib.createGunzip(), output)
          .then(async () => {
            await fs.promises.rename(tempPath, destination);
            await fs.promises.chmod(destination, 0o755);
            resolve();
          })
          .catch(async (error) => {
            await fs.promises.rm(tempPath, { force: true });
            reject(error);
          });
      })
      .on('error', reject);
  });
}

async function main() {
  const targetPath = path.join(process.cwd(), 'node_modules', '@prisma', 'engines', 'schema-engine-windows.exe');
  if (fs.existsSync(targetPath)) {
    return;
  }

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const url = `https://binaries.prisma.sh/all_commits/${enginesVersion}/windows/schema-engine.exe.gz`;
  await download(url, targetPath);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
