'use strict';

const path = require('path');
const fs = require("fs");
const request = require("request");
const puppeteer = require('puppeteer-core');

// Configuration
const CONFIG = {
  baseUrl: "https://4kwallpapers.com",
  collections: [
    "popular-abstract-wallpapers",
    "windows-11-fluidic-wallpapers",
    "windows-11-abstract-wallpapers",
    "windows-11-colorful-wallpapers"
  ],
  downloadPath: "D:/Pictures/Wallpapers/4kwallpapers",
  // Set to true to download all wallpapers to a single merged folder
  // Set to false to create separate folders for each collection
  mergedOutput: true,
  browser: {
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  }
};

// Utility Functions
function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
      return true;
    } catch (err) {
      console.error(`Error creating directory: ${err.message}`);
      return false;
    }
  } else {
    console.log(`Directory already exists: ${dirPath}`);
    return true;
  }
}

function downloadFile(uri, filename) {
  return new Promise((resolve, reject) => {
    // First, get file info to check expected size
    request.head(uri, (err, res, body) => {
      if (err) {
        console.error(`Error checking file: ${err.message}`);
        reject(err);
        return;
      }
      
      const expectedSize = parseInt(res.headers['content-length']) || 0;
      console.log(`Expected size for ${path.basename(filename)}: ${expectedSize} bytes`);
      
      const writeStream = fs.createWriteStream(filename);
      let downloadedSize = 0;
      
      const downloadRequest = request(uri)
        .on('error', (err) => {
          console.error(`Error downloading ${filename}: ${err.message}`);
          // Clean up partial file
          if (fs.existsSync(filename)) {
            fs.unlinkSync(filename);
          }
          reject(err);
        })
        .on('data', (chunk) => {
          downloadedSize += chunk.length;
        })
        .pipe(writeStream);
      
      writeStream.on('error', (err) => {
        console.error(`Error writing file ${filename}: ${err.message}`);
        // Clean up partial file
        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename);
        }
        reject(err);
      });
      
      writeStream.on('finish', () => {
        // Verify the download completed properly
        const actualSize = fs.statSync(filename).size;
        
        console.log(`Downloaded: ${path.basename(filename)} - ${actualSize} bytes`);
        
        // Check if file is suspiciously small or doesn't match expected size
        if (actualSize < 10000) { // Less than 10KB is suspicious for wallpapers
          console.warn(`⚠️  Warning: ${path.basename(filename)} is only ${actualSize} bytes (very small)`);
        }
        
        if (expectedSize > 0 && Math.abs(actualSize - expectedSize) > 1000) {
          console.warn(`⚠️  Warning: Size mismatch for ${path.basename(filename)} - Expected: ${expectedSize}, Got: ${actualSize}`);
          // Optionally, you could reject here to retry the download
          // reject(new Error(`Size mismatch: expected ${expectedSize}, got ${actualSize}`));
          // return;
        }
        
        resolve();
      });
    });
  });
}

// Browser Functions
async function initializeBrowser() {
  try {
    const browser = await puppeteer.launch(CONFIG.browser);
    const page = await browser.newPage();
    
    await page.exposeFunction('customLog', (message) => {
      console.log(`Browser: ${message}`);
    });
    
    return { browser, page };
  } catch (err) {
    console.error(`Error initializing browser: ${err.message}`);
    throw err;
  }
}

async function setupJQuery(page) {
  try {
    await page.addScriptTag({ path: require.resolve('jquery') });
    
    const jqueryVersion = await page.evaluate(() => {
      if (typeof $ !== 'undefined' && typeof $.fn !== 'undefined') {
        customLog(`jQuery loaded - Version: ${$.fn.jquery}`);
        return $.fn.jquery;
      } else {
        customLog('jQuery failed to load!');
        return null;
      }
    });
    
    return jqueryVersion !== null;
  } catch (err) {
    console.error(`Error setting up jQuery: ${err.message}`);
    return false;
  }
}

async function extractDownloadUrls(page) {
  try {
    const urls = await page.evaluate(async () => {
      // Handle load more button
      const loadMore = $("#load-more-button");
      customLog(`Load more button found: ${loadMore.length > 0 ? 'YES' : 'NO'}`);
      
      if (loadMore.length > 0) {
        let clickCount = 0;
        while (loadMore.css('display') === 'block' && clickCount < 10) { // Prevent infinite loop
          customLog(`Clicking load more button... (${++clickCount})`);
          loadMore.click();
          // In real scenario, you'd want to wait for content to load here
        }
        // wait for the page to load new content
        await new Promise(r => setTimeout(r, 3000));
      }
      // Extract download links
      const allLinks = $(".title.type>a");
      customLog(`Total links found: ${allLinks.length}`);
      
      const downloadLinks = allLinks.filter((i, x) => x.text === "Download");
      customLog(`Download links found: ${downloadLinks.length}`);
      downloadLinks.each((i, x) => {
        customLog(`Link ${i + 1}: ${x.href}`);
      });
      
      return downloadLinks.map((i, x) => x.href).get();
    });
    
    return urls || [];
  } catch (err) {
    console.error(`Error extracting URLs: ${err.message}`);
    return [];
  }
}

// Collection Processing
async function processCollection(page, collection) {
  console.log(`\n=== Processing: ${collection} ===`);
  
  const collectionUrl = `${CONFIG.baseUrl}/${collection}/`;
  
  // Determine output path based on mergedOutput setting
  const outputPath = CONFIG.mergedOutput ? 
    CONFIG.downloadPath : 
    path.join(CONFIG.downloadPath, collection);
  
  // Create output directory
  if (!createDirectoryIfNotExists(outputPath)) {
    console.log(`Skipping collection: ${collection} (directory creation failed)`);
    return;
  }
  
  try {
    // Navigate to collection page
    console.log(`Navigating to: ${collectionUrl}`);
    await page.goto(collectionUrl, { waitUntil: 'networkidle0' });
    
    // Setup jQuery
    if (!(await setupJQuery(page))) {
      console.log(`Skipping collection: ${collection} (jQuery setup failed)`);
      return;
    }
    
    // Extract download URLs
    const urls = await extractDownloadUrls(page);
    console.log(`Found ${urls.length} wallpapers in: ${collection}`);
    
    if (urls.length === 0) {
      console.log(`No wallpapers found in: ${collection}`);
      return;
    }
    
    // Download wallpapers
    await downloadWallpapers(urls, outputPath, collection);
    
  } catch (err) {
    console.error(`Error processing collection ${collection}: ${err.message}`);
  }
  
  console.log(`=== Completed: ${collection} ===`);
}

async function downloadWallpapers(urls, collectionPath, collectionName) {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const url of urls) {
    const filename = url.split("/").pop();
    const savePath = path.join(collectionPath, filename);
    
    try {
      // Check if file already exists and validate its size
      if (fs.existsSync(savePath)) {
        const existingSize = fs.statSync(savePath).size;
        
        // If existing file is suspiciously small, re-download it
        if (existingSize < 10000) {
          console.log(`🔄 Re-downloading: ${filename} (existing file only ${existingSize} bytes)`);
          fs.unlinkSync(savePath); // Delete the small file
        } else {
          console.log(`Skipping: ${filename} (already exists, ${existingSize} bytes)`);
          skipped++;
          continue;
        }
      }
      
      // Download file with retry logic
      let success = false;
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!success && attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`📥 Downloading: ${filename} (attempt ${attempts}/${maxAttempts})`);
          await downloadFile(url, savePath);
          
          // Verify download after completion
          if (fs.existsSync(savePath)) {
            const downloadedSize = fs.statSync(savePath).size;
            if (downloadedSize < 10000) {
              console.log(`❌ Download incomplete: ${filename} (${downloadedSize} bytes), retrying...`);
              fs.unlinkSync(savePath);
              throw new Error(`File too small: ${downloadedSize} bytes`);
            } else {
              console.log(`✅ Successfully downloaded: ${filename} (${downloadedSize} bytes)`);
              success = true;
              downloaded++;
            }
          } else {
            throw new Error('File not created');
          }
          
        } catch (downloadErr) {
          console.log(`❌ Attempt ${attempts} failed for ${filename}: ${downloadErr.message}`);
          
          // Clean up any partial file
          if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
          }
          
          if (attempts < maxAttempts) {
            console.log(`⏳ Waiting 3 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      if (!success) {
        console.error(`💥 Failed to download ${filename} after ${maxAttempts} attempts`);
        failed++;
      }
      
    } catch (err) {
      console.error(`Failed to process ${filename}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`Collection ${collectionName}: Downloaded ${downloaded}, Skipped ${skipped}, Failed ${failed}`);
}

// Main Function
async function main() {
  console.log('=== 4K Wallpapers Downloader ===');
  console.log(`Collections to process: ${CONFIG.collections.length}`);
  console.log(`Output mode: ${CONFIG.mergedOutput ? 'Merged (all in one folder)' : 'Separated (one folder per collection)'}`);
  
  // Create base directory
  if (!createDirectoryIfNotExists(CONFIG.downloadPath)) {
    console.error('Failed to create base download directory');
    process.exit(1);
  }
  
  let browser, page;
  
  try {
    // Initialize browser
    ({ browser, page } = await initializeBrowser());
    console.log('Browser initialized successfully');
    
    // Process each collection
    for (const collection of CONFIG.collections) {
      await processCollection(page, collection);
    }
    
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
  
  console.log('=== Download process completed ===');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}