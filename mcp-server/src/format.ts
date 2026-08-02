import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ShapeOutput, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Kickbase responses are passed through largely as-is (see client.ts), so we
// don't hand-maintain Zod outputSchemas for ~30 endpoints with undocumented,
// single-letter-keyed shapes that Kickbase can change without notice. This
// keeps every tool's *input* validated while output stays a flexible JSON blob.

// Matches the largest response we've seen in practice (unfiltered /matchdays)
// with headroom; keeps a single runaway response from blowing up the context.
export const CHARACTER_LIMIT = 25_000;

function toContent(result: unknown): CallToolResult {
  let text = JSON.stringify(result);
  if (text.length > CHARACTER_LIMIT) {
    const omitted = text.length - CHARACTER_LIMIT;
    text =
      `${text.slice(0, CHARACTER_LIMIT)}` +
      `... [truncated, ${omitted} more characters — narrow the request ` +
      `(pagination, a filter parameter, or a more specific ID) to see the rest]`;
  }
  return { content: [{ type: 'text', text }] };
}

function toError(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/**
 * Registers a tool that calls the Kickbase API and formats the result,
 * centralizing error handling and response-size truncation so individual
 * tool definitions only need to describe their schema and API call.
 */
export function registerApiTool<Shape extends ZodRawShapeCompat>(
  server: McpServer,
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: Shape;
    annotations: ToolAnnotations;
  },
  fn: (params: ShapeOutput<Shape>) => Promise<unknown>
): void {
  const callback = async (params: ShapeOutput<Shape>): Promise<CallToolResult> => {
    try {
      const result = await fn(params);
      return toContent(result);
    } catch (err) {
      return toError(err);
    }
  };

  // registerTool's callback type is a conditional type over the (here generic,
  // not concrete) Shape parameter, which TS cannot verify through this
  // pass-through wrapper even though it resolves correctly at every call site
  // below (all of which use concrete shapes).
  server.registerTool(name, config, callback as never);
}
