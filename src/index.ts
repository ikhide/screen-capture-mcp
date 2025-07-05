#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  captureScreen,
  extractTextFromImage,
  captureApplicationScreen,
  getRunningApplications,
  captureScreenAndExtractText,
} from "./tools.js";

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: "mcp-screen-text",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define the tools available to the server
  const tools: Tool[] = [
    {
      name: "capture_screen",
      description: "Captures a screenshot of the specified display",
      inputSchema: {
        type: "object",
        properties: {
          display: {
            type: "number",
            description: "Display number (0 for primary display)",
            default: 0,
          },
          format: {
            type: "string",
            enum: ["png", "jpg"],
            description: "Image format",
            default: "png",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "capture_application_screen",
      description: "Captures a screenshot of a specific application window",
      inputSchema: {
        type: "object",
        properties: {
          applicationName: {
            type: "string",
            description:
              "Name of the application to capture (e.g., 'Safari', 'Chrome', 'Finder')",
          },
          format: {
            type: "string",
            enum: ["png", "jpg"],
            description: "Image format",
            default: "png",
          },
        },
        required: ["applicationName"],
        additionalProperties: false,
      },
    },
    {
      name: "list_applications",
      description: "Lists all running applications that can be captured",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "extract_text",
      description: "Extracts text from an image using OCR",
      inputSchema: {
        type: "object",
        properties: {
          imagePath: {
            type: "string",
            description: "Path to the image file",
          },
          language: {
            type: "string",
            description: "Language code for OCR (e.g., eng, spa, fra)",
            default: "eng",
          },
        },
        required: ["imagePath"],
        additionalProperties: false,
      },
    },
    {
      name: "capture_screen_and_extract_text",
      description:
        "Captures a screenshot and extracts text from it in one operation. Can capture full screen or a specific application window.",
      inputSchema: {
        type: "object",
        properties: {
          display: {
            type: "number",
            description:
              "Display number (0 for primary display) - ignored if applicationName is provided",
            default: 0,
          },
          language: {
            type: "string",
            description: "Language code for OCR (e.g., eng, spa, fra)",
            default: "eng",
          },
          applicationName: {
            type: "string",
            description:
              "Name of the application to capture (e.g., 'Safari', 'Chrome'). If provided, captures only this application's window instead of full screen.",
          },
        },
        additionalProperties: false,
      },
    },
  ];

  // Register tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  // Register tool execution handler with comprehensive error handling
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "capture_screen": {
          const display = (args?.display as number) || 0;
          const format = (args?.format as "png" | "jpg") || "png";

          console.error(
            `Capturing screen - Display: ${display}, Format: ${format}`
          );

          const result = await captureScreen({ display, format });

          return {
            content: [
              {
                type: "text",
                text: `Screenshot captured successfully!\nPath: ${result.path}\nFormat: ${format}\nDisplay: ${display}`,
              },
              {
                type: "image",
                data: result.base64,
                mimeType: `image/${format}`,
              },
            ],
          };
        }

        case "capture_application_screen": {
          if (!args?.applicationName) {
            throw new Error("applicationName is required");
          }

          const applicationName = args.applicationName as string;
          const format = (args?.format as "png" | "jpg") || "png";

          console.error(
            `Capturing application screen - App: ${applicationName}, Format: ${format}`
          );

          const result = await captureApplicationScreen(
            applicationName,
            format
          );

          return {
            content: [
              {
                type: "text",
                text: `Application screenshot captured successfully!\nApp: ${applicationName}\nPath: ${result.path}\nFormat: ${format}`,
              },
              {
                type: "image",
                data: result.base64,
                mimeType: `image/${format}`,
              },
            ],
          };
        }

        case "list_applications": {
          console.error("Listing running applications");

          const applications = await getRunningApplications();

          const appList = applications.map((app) => `• ${app.name}`).join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Running applications:\n\n${appList}\n\nYou can use any of these application names with the capture_application_screen tool.`,
              },
            ],
          };
        }

        case "extract_text": {
          if (!args?.imagePath) {
            throw new Error("imagePath is required");
          }

          const imagePath = args.imagePath as string;
          const language = (args?.language as string) || "eng";

          console.error(
            `Extracting text from: ${imagePath}, Language: ${language}`
          );

          const extractedText = await extractTextFromImage(imagePath, language);

          return {
            content: [
              {
                type: "text",
                text: `Text extracted successfully from: ${imagePath}\n\nExtracted text:\n${extractedText}`,
              },
            ],
          };
        }

        case "capture_screen_and_extract_text": {
          const display = (args?.display as number) || 0;
          const language = (args?.language as string) || "eng";
          const applicationName = args?.applicationName as string | undefined;

          console.error(
            `Capturing screen and extracting text - Display: ${display}, Language: ${language}${
              applicationName ? `, App: ${applicationName}` : ""
            }`
          );

          const result = await captureScreenAndExtractText({
            display,
            language,
            applicationName,
          });

          return {
            content: [
              {
                type: "text",
                text: `Screenshot captured and text extracted successfully!\nPath: ${
                  result.screenshot.path
                }${
                  applicationName
                    ? `\nApplication: ${applicationName}`
                    : `\nDisplay: ${display}`
                }\nLanguage: ${language}\n\nExtracted text:\n${result.text}`,
              },
              {
                type: "image",
                data: result.screenshot.base64,
                mimeType: "image/png",
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error executing tool '${name}':`, errorMessage);

      return {
        content: [
          {
            type: "text",
            text: `Error executing tool '${name}': ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  try {
    const server = createServer();
    const transport = new StdioServerTransport();

    console.error("MCP Screen Text Server starting...");

    await server.connect(transport);

    console.error("MCP Screen Text Server connected and ready!");
    console.error(
      "Available tools: capture_screen, capture_application_screen, list_applications, extract_text, capture_screen_and_extract_text"
    );
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.error("MCP Screen Text Server shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("MCP Screen Text Server shutting down...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
