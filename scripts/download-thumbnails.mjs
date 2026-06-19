import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const REF_REPO = '/Users/onee/Code/onee-workspace/projects/learning/wwdc';
const OUTPUT_BASE = process.env.WWDC_THUMBNAIL_OUTPUT_DIR || '.cache/session-thumbnails';

// Parse frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fm = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fm[key] = val;
    }
  });
  return fm;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true, size: fs.statSync(dest).size });
        });
      } else {
        file.close();
        fs.unlinkSync(dest);
        resolve({ success: false, status: res.statusCode });
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve({ success: false, error: err.message });
    });
  });
}

async function processYear(year) {
  const yearDir = path.join(REF_REPO, 'src/content', `wwdc${year}`);
  const outDir = path.join(OUTPUT_BASE, year);
  
  if (!fs.existsSync(yearDir)) {
    console.log(`  WWDC${year}: no reference data`);
    return { downloaded: 0, copied: 0, failed: 0 };
  }
  
  fs.mkdirSync(outDir, { recursive: true });
  
  const files = fs.readdirSync(yearDir).filter(f => f.endsWith('.md'));
  let downloaded = 0, copied = 0, failed = 0;
  
  // Process in batches of 10 to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const promises = batch.map(async (file) => {
      const id = file.replace('.md', '');
      const content = fs.readFileSync(path.join(yearDir, file), 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm || !fm.thumbnail) return;
      
      const destPath = path.join(outDir, `${id}.jpg`);
      if (fs.existsSync(destPath)) return; // Already exists
      
      let thumbUrl = fm.thumbnail;
      
      if (thumbUrl.startsWith('/images/sessions/')) {
        // Local image in reference repo - copy it
        const srcPath = path.join(REF_REPO, 'public', thumbUrl);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        } else {
          // Try root-level fallback (some old images are at root)
          const rootPath = path.join(REF_REPO, 'public/images/sessions', `${id}.jpg`);
          if (fs.existsSync(rootPath)) {
            fs.copyFileSync(rootPath, destPath);
            copied++;
          } else {
            failed++;
            console.log(`  Missing local: ${thumbUrl} for ${year}/${id}`);
          }
        }
      } else if (thumbUrl.startsWith('http')) {
        // Apple CDN - download
        const result = await download(thumbUrl, destPath);
        if (result.success) {
          downloaded++;
        } else {
          failed++;
          console.log(`  Download failed: ${year}/${id} (${result.status || result.error})`);
        }
      }
    });
    
    await Promise.all(promises);
    
    if (i + batchSize < files.length) {
      await new Promise(r => setTimeout(r, 500)); // Small delay between batches
    }
  }
  
  return { downloaded, copied, failed };
}

async function main() {
  fs.mkdirSync(OUTPUT_BASE, { recursive: true });
  
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
  let totalDownloaded = 0, totalCopied = 0, totalFailed = 0;
  
  for (const year of years) {
    process.stdout.write(`WWDC${year}: `);
    const result = await processYear(year);
    totalDownloaded += result.downloaded;
    totalCopied += result.copied;
    totalFailed += result.failed;
    console.log(`downloaded ${result.downloaded}, copied ${result.copied}, failed ${result.failed}`);
  }
  
  console.log(`\nTotal: downloaded ${totalDownloaded}, copied ${totalCopied}, failed ${totalFailed}`);
}

main().catch(console.error);
