import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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

mcp.tool("memory_add", { text: z.string(), tag: z.string().optional() }, async ({ text, tag }) => {
  const dt = new Date().toISOString();
  memoryStore.push({ text, tag: tag || null, time: dt });
  return { content: [{ type: "text", text: `saved at ${dt}` }] };
});

mcp.tool(
  "memory_search",
  { query: z.string(), limit: z.number().int().min(1).max(10).optional() },
  async ({ query, limit }) => {
    const q = query.toLowerCase();
    const max = limit || 5;
    const hits = memoryStore
      .filter((m) => m.text.toLowerCase().includes(q))
      .slice(-max);
    return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
  }
);

const app = express();
app.use(express.json({ limit: "1mb" }));

// 建立 SSE 连接
app.get("/sse", (req, res) => {
  const transport = new SSEServerTransport("/messages", req, res);
  // 不要 await，保持长连接
  mcp.connect(transport).catch((err) => {
    console.error("SSE connect error", err);
  });
});

// 工具调用消息转交给 SSE 传输层
app.post("/messages", async (req, res) => {
  try {
    await SSEServerTransport.handlePost(req, res);
  } catch (e) {
    console.error("handlePost error", e);
    if (!res.headersSent) {
      res.status(500).json({ error: String(e) });
    }
  }
});

app.get("/", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`listening on :${port} (SSE at /sse)`);
});
