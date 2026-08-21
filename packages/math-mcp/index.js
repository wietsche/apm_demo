import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "math-mcp",
  version: "1.1.0",
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "add",
      description: "Add two numbers",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "First number" },
          b: { type: "number", description: "Second number" },
        },
        required: ["a", "b"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "add") {
    const result = args.a + args.b;
    return {
      type: "text",
      text: `${args.a} + ${args.b} = ${result}`,
    };
  }

  return { type: "text", text: "Unknown tool" };
});

const transport = new StdioServerTransport();
await server.connect(transport);
