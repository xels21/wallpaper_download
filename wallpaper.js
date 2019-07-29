// 'use strict';

const path = require('path');
const fs = require("fs");
const request = require("request");
const puppeteer = require('puppeteer-core');


global.appRoot = path.resolve(__dirname);

// function main() {
const baseUrl = "https://wallpaperscraft.com";
const startUrl = baseUrl + "/all/ratings/3840x2160/page";

const pageCount = 100;

path_to_save = "D:/Pictures/Wallpapers/WallpaperScript";

(async () => {
  const options = {
    headless: true,
    // headless: false,
    executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  }
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
    await page.goto(startUrl + pageIndex.toString());
    // await page.addScriptTag({path: require.resolve('jquery')})
    var selectorWallpaperContainer = "body > div > div.l-body > div.l-layout.l-layout_wide > div > div.content-main > div.wallpapers.wallpapers_zoom.wallpapers_main"
    var selectorWallpaperLinks = selectorWallpaperContainer + " > ul > li > a"
    // page.waitForSelector(selectorWallpaperContainer)
    let urls = await page.evaluate((selectorWallpaperLinks) => {
      console.log(selectorWallpaperLinks)
      const urls = [];
      hrefs = document.querySelectorAll(selectorWallpaperLinks);
      hrefs.forEach(function (el) {
        urls.push(el.getAttribute("href"))
      });
      return urls;
    }, selectorWallpaperLinks);
    console.log(urls)

    // await  links.forEach(url => {
    // await (async function () {
    for (let url of urls) {
      picName = url.replace(/\/download\//gi, "").replace(/\//gi, "_") + ".jpg"
      savePath = path.join(path_to_save, picName)
      try {
        if (fs.existsSync(savePath)) {
          continue
        }
      } catch (err) { }
      downloadUrl = baseUrl + "/image/" + picName
      await download(downloadUrl, savePath, () => { })
    }
    // await page.screenshot({ path: 'example.png', });
    // })
  }
  await browser.close();
})()

function download(uri, filename, callback) {
  return new Promise(function (resolve, reject) {
    request.head(uri, function (err, res, body) {
      request(uri)
        .on('error', function (err) { reject() })
        .pipe(fs.createWriteStream(filename))
        .on("close", () => { resolve(); callback() });
    })
  });
}