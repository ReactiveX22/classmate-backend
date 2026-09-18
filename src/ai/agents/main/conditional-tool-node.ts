import { RunnableConfig, RunnableToolLike } from '@langchain/core/runnables';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { Logger } from '@nestjs/common';
import { StructuredToolInterface, DynamicTool } from '@langchain/core/tools';

const WEB_SEARCH_TOOL_NAMES = new Set(['web_search', 'tavily_search']);

/**
 * A ToolNode that conditionally executes tools based on configurable flags.
 *
 * When `configurable.webSearch` is false, web search tool calls are stripped
 * from the AIMessage before ToolNode processes them, so the model sees an
 * error response and the tool events are never emitted.
 */
export class ConditionalToolNode extends ToolNode {
  private readonly logger = new Logger(ConditionalToolNode.name);

  constructor(
    tools: (StructuredToolInterface | DynamicTool | RunnableToolLike)[],
  ) {
    super(tools, { handleToolErrors: true });
  }

  protected override async run(
    input: unknown,
    config: RunnableConfig,
  ): Promise<unknown> {
    const webSearch =
      (config?.configurable as Record<string, unknown> | undefined)
        ?.webSearch === true;

    if (webSearch) {
      return super.run(input, config);
    }

    // Extract messages from input
    let messages;
    if (Array.isArray(input)) {
      messages = input;
    } else if (
      typeof input === 'object' &&
      input !== null &&
      'messages' in input
    ) {
      messages = (input as { messages: unknown[] }).messages;
    } else {
      return super.run(input, config);
    }

    // Find the last AIMessage and strip web search tool calls
    let aiMessage: AIMessage | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg instanceof AIMessage) {
        aiMessage = msg;
        break;
      }
    }

    if (!aiMessage?.tool_calls?.length) {
      return super.run(input, config);
    }

    const filteredCalls = aiMessage.tool_calls.filter(
      (call) => !WEB_SEARCH_TOOL_NAMES.has(call.name),
    );

    if (filteredCalls.length === aiMessage.tool_calls.length) {
      return super.run(input, config);
    }

    if (filteredCalls.length === 0) {
      // All tool calls were web search — return error messages
      this.logger.debug(
        `Stripped all ${aiMessage.tool_calls.length} web search tool call(s) — web search not enabled`,
      );
      const errorMessages = aiMessage.tool_calls.map(
        (call) =>
          new ToolMessage({
            status: 'error',
            content:
              'Web search is not enabled for this message. Respond without web search.',
            name: call.name,
            tool_call_id: call.id ?? '',
          }),
      );
      return Array.isArray(input)
        ? errorMessages
        : { messages: errorMessages };
    }

    // Some calls remain — replace the AIMessage with filtered calls
    this.logger.debug(
      `Stripped ${aiMessage.tool_calls.length - filteredCalls.length} web search tool call(s)`,
    );
    const filteredMessage = new AIMessage({
      ...aiMessage,
      tool_calls: filteredCalls,
    });

    const newMessages = [...messages];
    for (let i = newMessages.length - 1; i >= 0; i--) {
      if (newMessages[i] === aiMessage) {
        newMessages[i] = filteredMessage;
        break;
      }
    }

    return super.run(
      Array.isArray(input) ? newMessages : { messages: newMessages },
      config,
    );
  }
}
