# MCP Screen Text

A Model Context Protocol (MCP) server that provides screen capture and optical character recognition (OCR) capabilities.

## 🎥 Demo Video

[![MCP Screen Text Demo](https://img.shields.io/badge/▶️-Watch%20Demo-red?style=for-the-badge&logo=youtube)](https://vimeo.com/1098955586/0585e7907f?share=copy)

_See MCP Screen Text in action - capturing screens and extracting text with Claude Desktop_

## Features

- **Screen Capture**: Take screenshots of specific displays or applications
- **Application-Specific Screenshots**: Capture screenshots of specific application windows
- **OCR Text Extraction**: Extract text from screenshots or existing images
- **Desktop Storage**: All screenshots are saved to a "Screenshots" folder on your Desktop
- **Multi-format Support**: Support for PNG and JPG image formats
- **Multi-language OCR**: Support for multiple languages in text recognition
- **Application Discovery**: List running applications available for capture

## Tools Available

### `capture_screen`

Captures a screenshot of the entire screen or a specific display.

**Parameters:**

- `display` (number, optional): Display number to capture (0 for primary display)
- `format` (string, optional): Image format for the screenshot ('png' or 'jpg')

### `capture_application_screen`

Captures a screenshot of a specific application window.

**Parameters:**

- `applicationName` (string, required): Name of the application to capture (e.g., 'Safari', 'Chrome', 'Finder')
- `format` (string, optional): Image format ('png' or 'jpg')

### `list_applications`

Lists all running applications that can be captured.

**Parameters:** None

### `extract_text`

Extracts text from an existing image file using OCR.

**Parameters:**

- `imagePath` (string, required): Path to the image file
- `language` (string, optional): Language for OCR recognition (e.g., "eng", "spa", "fra")

### `capture_screen_and_extract_text`

Captures a screenshot and extracts text from it in one operation. This is a convenience tool that combines screen capture and OCR and can work with both full screen and application-specific capture.

**Parameters:**

- `display` (number, optional): Display number to capture (0 for primary display) - ignored if applicationName is provided
- `language` (string, optional): Language for OCR recognition (e.g., "eng", "spa", "fra")
- `applicationName` (string, optional): Name of the application to capture (e.g., 'Safari', 'Chrome'). If provided, captures only this application's window instead of full screen.

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run the built version
npm start
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for server implementation
- `screenshot-desktop`: Cross-platform screenshot capture
- `sharp`: High-performance image processing
- `tesseract.js`: OCR text extraction

## Usage with MCP Client

This server can be used with any MCP-compatible client. Configure your client to connect to this server using stdio transport.

Example configuration for Claude Desktop:

```json
{
  "mcpServers": {
    "screen-text": {
      "command": "node",
      "args": ["path/to/mcp-screen-text/dist/index.js"]
    }
  }
}
```

## License

ISC
