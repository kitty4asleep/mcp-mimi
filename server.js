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

mcp.tool("memory_search", { query: z.string(), limit: z.number().int().min(1).max(10).optional() }, async ({ query, limit }) => {
  const q = query.toLowerCase();
  const max = limit || 5;
  const hits = memoryStore.filter((m) => m.text.toLowerCase().includes(q)).slice(-max);
  return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
});

const app = express();
app.use(express.json({ limit: "1mb" }));

// 1) 建立 SSE 连接：Kelivo 选 SSE 时会连这个地址
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcp.connect(transport);
});

// 2) 工具调用消息会 POST 到这里
app.post("/messages", async (req, res) => {
  try {
    // SSE transport 会自己从 req.body 读取消息
    res.status(200).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`listening on :${port} (SSE at /sse)`);
});
  "memory_add",
  { text: z.string(), tag: z.string().optional() },
  async ({ text, tag }) => {
    const dt = new Date().toISOString();
    memoryStore.push({ text, tag: tag || null, time: dt });
    return {
      content: [{ type: "text", text: `saved at ${dt}` }]
    };
  }
;

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
