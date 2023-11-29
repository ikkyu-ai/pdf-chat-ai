"use client";

import { useContext, useRef, useState } from "react";
import { InputMessage } from "./input-message";
import { scrollToBottom, initialMessage } from "@/lib/utils";
import { ChatLine } from "./chat-line";
import { ChatGPTMessage } from "@/types";
import { PdfContext } from "@/app/page";
import { Input } from '@douyinfe/semi-ui';

export const Chat = () => {
  const endpoint = "/api/chat";
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatGPTMessage[]>(initialMessage);
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [streamingAIContent, setStreamingAIContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedText } = useContext(PdfContext);
  console.log('selectedText: ', selectedText);

  const updateMessages = (message: ChatGPTMessage) => {
    setMessages((previousMessages) => [...previousMessages, message]);
    setTimeout(() => scrollToBottom(containerRef), 100);
  };

  const updateChatHistory = (question: string, answer: string) => {
    setChatHistory((previousHistory) => [
      ...previousHistory,
      [question, answer],
    ]);
  };

  const updateStreamingAIContent = (streamingAIContent: string) => {
    setStreamingAIContent(streamingAIContent);
    setTimeout(() => scrollToBottom(containerRef), 100);
  };

  const handleStreamEnd = (
    question: string,
    streamingAIContent: string,
    sourceDocuments: string
  ) => {
    const sources = JSON.parse(sourceDocuments);

    // Add the streamed message as the AI response
    // And clear the streamingAIContent state
    updateMessages({
      role: "assistant",
      content: streamingAIContent,
      sources,
    });
    updateStreamingAIContent("");
    updateChatHistory(question, streamingAIContent);
  };

  // send message to API /api/chat endpoint
  const sendQuestion = async (question: string) => {
    setIsLoading(true);
    updateMessages({ role: "user", content: question });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          chatHistory,
        }),
      });

      const reader = response?.body?.getReader();
      let streamingAIContent = "";
      let tokensEnded = false;
      let sourceDocuments = "";

      while (true) {
        const { done, value } = (await reader?.read()) || {};

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        if (text === "tokens-ended" && !tokensEnded) {
          tokensEnded = true;
        } else if (tokensEnded) {
          sourceDocuments = text;
        } else {
          streamingAIContent = streamingAIContent + text;
          updateStreamingAIContent(streamingAIContent);
        }
      }

      handleStreamEnd(question, streamingAIContent, sourceDocuments);
    } catch (error) {
      console.log("Error occured ", error);
    } finally {
      setIsLoading(false);
    }
  };

  let placeholder = "Type a message to start ...";

  if (messages.length > 2) {
    placeholder = "Type to continue your conversation";
  }

  return (
    <div className='fixed right-3 p-3' style={{ borderRadius: 18, width: '20vw', backgroundColor: 'white' }}>
      <div ref={containerRef}>
        {messages.map(({ content, role, sources }, index) => (
          <ChatLine
            key={index}
            role={role}
            content={content}
            sources={sources}
          />
        ))}
        {streamingAIContent ? (
          <ChatLine role={"assistant"} content={streamingAIContent} />
        ) : (
          <></>
        )}
      </div>

      {/* <InputMessage
        input={input}
        setInput={setInput}
        sendMessage={sendQuestion}
        placeholder={placeholder}
        isLoading={isLoading}
      /> */}
      <div className='text-black'>{selectedText}</div>
      <Input />
    </div>
  );
}
