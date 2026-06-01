import { useState, useCallback, useRef } from "react";

export interface StreamMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAIStreamOptions {
  onChunk?: (chunk: string, fullContent: string) => void;
  onDone?: (fullContent: string, totalTokens: number) => void;
  onError?: (error: string) => void;
}

export function useAIStream(options: UseAIStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (params: {
    messages: StreamMessage[];
    mode?: string;
    systemPrompt?: string;
    contextCode?: string;
    contextProject?: string;
    sessionId?: number;
  }) => {
    // Cancel any existing stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setStreamingContent("");

    let fullContent = "";

    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === "chunk") {
              fullContent += event.content;
              setStreamingContent(fullContent);
              options.onChunk?.(event.content, fullContent);
            } else if (event.type === "done") {
              options.onDone?.(event.content ?? fullContent, event.totalTokens ?? 0);
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // Skip malformed events
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const errMsg = err.message ?? "AI 请求失败";
      options.onError?.(errMsg);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    return fullContent;
  }, [options]);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { isStreaming, streamingContent, startStream, cancelStream };
}
