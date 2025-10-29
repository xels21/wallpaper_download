# Wallpaper Download Scripts

This repository contains scripts to download wallpapers from various sources.

## Features

### Merged Folder Output Option

Both wallpaper download scripts now support a **merged output** option that allows you to:

- **Separated Output** (default): Creates separate folders for each collection/source
- **Merged Output**: Downloads all wallpapers to a single folder

## Configuration

### wallpaper_4kwallpapers.js

You can configure the script in several ways:

#### 1. Using config.json file (Recommended)

Create or modify `config.json`:

```json
{
  "baseUrl": "https://4kwallpapers.com",
  "collections": [
    "popular-abstract-wallpapers",
    "windows-11-fluidic-wallpapers",
    "windows-11-abstract-wallpapers",
    "windows-11-colorful-wallpapers"
  ],
  "downloadPath": "D:/Pictures/Wallpapers/4kwallpapers",
  "mergedOutput": false,
  "browser": {
    "headless": true,
    "executablePath": "C:/Program Files/Google/Chrome/Application/chrome.exe"
  }
}
```

#### 2. Configuration Options

- `mergedOutput: true` - All wallpapers downloaded to one folder with collection prefixes
- `mergedOutput: false` - Separate folders created for each collection

#### 3. Pre-configured Files

- `config.json` - Default separated output configuration
- `config_merged.json` - Pre-configured for merged output

### wallpaper.js

The wallpapers craft script now also has a `mergedOutput` configuration option (defaults to `true` since it already used merged output).

## Running the Scripts

### Basic Usage

```bash
node wallpaper_4kwallpapers.js
node wallpaper.js
```

### Using Batch Scripts

- `scripts/run_4kwallpapers.bat` - Run with default configuration
- `scripts/run_4kwallpapers_merged.bat` - Run with merged output enabled
- `scripts/run_4kwallpapers_merged_config.bat` - Run using config_merged.json

## File Naming in Merged Mode

When `mergedOutput` is enabled, files are prefixed with their collection name to prevent conflicts:

**Separated Output:**
```
4kwallpapers/
├── popular-abstract-wallpapers/
│   ├── wallpaper1.jpg
│   └── wallpaper2.jpg
└── windows-11-fluidic-wallpapers/
    ├── wallpaper1.jpg
    └── wallpaper3.jpg
```

**Merged Output:**
```
4kwallpapers_merged/
├── popular-abstract-wallpapers_wallpaper1.jpg
├── popular-abstract-wallpapers_wallpaper2.jpg
├── windows-11-fluidic-wallpapers_wallpaper1.jpg
└── windows-11-fluidic-wallpapers_wallpaper3.jpg
```

## Benefits of Merged Output

- **Easier browsing**: All wallpapers in one location
- **Simpler organization**: No need to navigate through multiple folders
- **Conflict prevention**: Collection prefixes prevent filename conflicts
- **Batch operations**: Easier to perform operations on all wallpapers at once

## Installation

Make sure you have Node.js installed and run:

```bash
npm install puppeteer-core request jquery
```