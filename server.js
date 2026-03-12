import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const mcp = new Server(
  { name: "mcp-mimi", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const memoryStore = [];

mcp.tool("now", { tz: z.string().optional() }, async ({ tz }) => {
  const dt = new Date();
  const datetime_utc = dt.toISOString();
  const unix_ms = dt.getTime();
  const local_string = dt.toLocaleString("zh-CN", {
    timeZone: tz || undefined,
    hour12: false
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { datetime_utc, local_string, unix_ms, tz: tz ?? "local" },
          null,
          2
        )
      }
    ]
  };
});

mcp.tool(
  "memory_add",
  { text: z.string(), tag: z.string().optional() },
  async ({ text, tag }) => {
    const dt = new Date().toISOString();
    memoryStore.push({ text, tag: tag || null, time: dt });
    return {
      content: [{ type: "text", text: `saved at ${dt}` }]
    };
  }
);

mcp.tool(
  "memory_search",
  { query: z.string(), limit: z.number().int().min(1).max(10).optional() },
  async ({ query, limit }) => {
    const q = query.toLowerCase();
    const max = limit || 5;
    const hits = memoryStore
      .filter((m) => m.text.toLowerCase().includes(q))
      .slice(-max);

    return {
      content: [{ type: "text", text: JSON.stringify(hits, null, 2) }]
    };
  }
);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport(req, res);
  await mcp.connect(transport);
});

app.get("/", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`listening on :${port}`);
});
