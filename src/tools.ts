import screenshot from "screenshot-desktop";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export interface ScreenshotResult {
  path: string;
  base64: string;
  buffer: Buffer;
}

/**
 * Captures a screenshot of the specified display or application
 * @param options Capture options
 * @returns Screenshot result with path, base64 data, and buffer
 */
export async function captureScreen(
  options: {
    display?: number;
    format?: "png" | "jpg";
    applicationName?: string;
  } = {}
): Promise<ScreenshotResult> {
  const { display = 0, format = "png", applicationName } = options;

  // If applicationName is provided, use application-specific capture
  if (applicationName) {
    return await captureApplicationScreen(applicationName, format);
  }
  try {
    // Capture screenshot
    const imageBuffer = await screenshot({ screen: display, format });

    // Process with sharp if needed (for format conversion or optimization)
    let processedBuffer: Buffer;
    if (format === "jpg") {
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      processedBuffer = await sharp(imageBuffer).png().toBuffer();
    }

    // Create screenshots folder and generate filename with timestamp
    const screenshotsFolder = await createScreenshotsFolder();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `screenshot-display-${display}-${timestamp}.${format}`;
    const filepath = path.join(screenshotsFolder, filename);

    // Save to file
    await fs.writeFile(filepath, processedBuffer);

    // Convert to base64
    const base64 = processedBuffer.toString("base64");

    return {
      path: filepath,
      base64,
      buffer: processedBuffer,
    };
  } catch (error) {
    throw new Error(
      `Failed to capture screen: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Extracts text from an image using OCR
 * @param input Image buffer or file path
 * @param language Language code for OCR (default: 'eng')
 * @returns Extracted text
 */
export async function extractTextFromImage(
  input: Buffer | string,
  language: string = "eng"
): Promise<string> {
  const worker = await createWorker(language);

  try {
    let imageBuffer: Buffer;

    if (typeof input === "string") {
      // Input is a file path
      imageBuffer = await fs.readFile(input);
    } else {
      // Input is already a buffer
      imageBuffer = input;
    }

    // Preprocess image for better OCR results
    const processedImage = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();

    // Perform OCR
    const {
      data: { text },
    } = await worker.recognize(processedImage);

    return text.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    await worker.terminate();
  }
}

/**
 * Captures screen and extracts text in one operation
 * @param options Capture and OCR options
 * @returns Extracted text and screenshot info
 */
export async function captureScreenAndExtractText(
  options: {
    display?: number;
    language?: string;
    applicationName?: string;
  } = {}
): Promise<{
  text: string;
  screenshot: ScreenshotResult;
}> {
  const { display = 0, language = "eng", applicationName } = options;

  const screenshot = await captureScreen({
    display,
    format: "png",
    applicationName,
  });
  const text = await extractTextFromImage(screenshot.buffer, language);

  return {
    text,
    screenshot,
  };
}

// Additional interface for application info
export interface ApplicationInfo {
  name: string;
  pid: number;
  bundleId?: string;
}

/**
 * Creates screenshots folder on desktop
 * @returns Path to the screenshots folder
 */
export async function createScreenshotsFolder(): Promise<string> {
  const desktopPath = path.join(os.homedir(), "Desktop");
  const screenshotsFolder = path.join(desktopPath, "mcp-screenshots");

  try {
    await fs.mkdir(screenshotsFolder, { recursive: true });
    return screenshotsFolder;
  } catch (error) {
    throw new Error(
      `Failed to create screenshots folder: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get list of running applications (macOS specific)
 * @returns Array of application information
 */
export async function getRunningApplications(): Promise<ApplicationInfo[]> {
  try {
    // Use osascript to get running applications on macOS
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const script = `
      tell application "System Events"
        set appList to {}
        repeat with proc in (every process whose background only is false)
          set appList to appList & {name of proc as string}
        end repeat
        return appList
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const appNames = stdout
      .trim()
      .split(", ")
      .map((name) => name.trim());

    return appNames.map((name, index) => ({
      name,
      pid: index, // Placeholder - in a real implementation you'd get actual PIDs
    }));
  } catch (error) {
    throw new Error(
      `Failed to get running applications: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Capture screenshot of a specific application window (macOS specific)
 * @param applicationName Name of the application to capture
 * @param format Image format ('png' or 'jpg')
 * @returns Screenshot result with path, base64 data, and buffer
 */
export async function captureApplicationScreen(
  applicationName: string,
  format: "png" | "jpg" = "png"
): Promise<ScreenshotResult> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    // Create screenshots folder
    const screenshotsFolder = await createScreenshotsFolder();

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${applicationName}-${timestamp}.${format}`;
    const filepath = path.join(screenshotsFolder, filename);

    // Use screencapture with window selection for the specific app
    const script = `
      tell application "${applicationName}"
        activate
      end tell
      
      tell application "System Events"
        tell process "${applicationName}"
          set frontmost to true
          set windowList to every window
          if (count of windowList) > 0 then
            set frontWindow to item 1 of windowList
            return true
          else
            return false
          end if
        end tell
      end tell
    `;

    try {
      await execAsync(`osascript -e '${script}'`);
      // Wait a moment for the application to come to front
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capture the frontmost window
      await execAsync(`screencapture -o -w "${filepath}"`);
    } catch (appError) {
      // Fallback to full screen capture if app-specific capture fails
      console.error(
        `App-specific capture failed, falling back to full screen: ${appError}`
      );
      return await captureScreen({ display: 0, format });
    }

    // Read the captured image
    const imageBuffer = await fs.readFile(filepath);

    // Process with sharp if needed
    let processedBuffer: Buffer;
    if (format === "jpg") {
      processedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    } else {
      processedBuffer = await sharp(imageBuffer).png().toBuffer();
    }

    // Save processed image back
    await fs.writeFile(filepath, processedBuffer);

    // Convert to base64
    const base64 = processedBuffer.toString("base64");

    return {
      path: filepath,
      base64,
      buffer: processedBuffer,
    };
  } catch (error) {
    throw new Error(
      `Failed to capture application screen: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
