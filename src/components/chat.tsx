"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { InputMessage } from "./input-message";
import { scrollToBottom, initialMessage } from "@/lib/utils";
import { ChatLine } from "./chat-line";
import { ChatGPTMessage, DocumentInfo } from "@/types";
import { Document } from "langchain/document";
import { PdfContext } from "@/app/page";
import { Button, Input, TextArea, Typography } from "@douyinfe/semi-ui";
import "./chat.css";
import { IHighlight } from "@/app/types/types";

interface ITempChat {
  selectedText: string;
  chatHistory: [string, string][];
}

export interface History {
  highlightId: string;
  chatHistory: [string, string][];
  highlight: IHighlight;
}

export interface FileStorage {
  fileName: string;
  histories: History[];
}
export interface ChatStorage {
  files: FileStorage[];
}

const aiModeToEndpoint = {
  chat: "/api/chat",
  summarize: "/api/summarize",
  translate: "/api/translate",
  explain: "/api/explain",
};

const aiModeToActionText = {
  chat: "Thinking...",
  summarize: "Producing a summary...",
  translate: "Coming up with a translation...",
  explain: "Thinking of an explanation...",
};

export const Chat = () => {
  const { Paragraph } = Typography;
  const {
    addHighlight,
    setHighlights,
    selectedHighlight,
    highlights,
    fileName,
    storage,
    indexKey,
    selectedText,
    aiMode,
    summary,
    isAIBusy,
    setIsAIBusy,
    showChat,
    setSelectedHighlight,
    setNeedRefreshHighlights,
    needRefreshHighlights,
  } = useContext(PdfContext);
  const endpoint = "/api/chat";
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatGPTMessage[]>(initialMessage);
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [streamingAIContent, setStreamingAIContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [currHighlightId, setCurrHighlightId] = useState<string>("");

  console.log("chatHistory: ", chatHistory);

  const handleHashChange = () => {
    const hash = window.location.hash;
    const id = hash.split("-")[1];
    setCurrHighlightId(id);
    if (setSelectedHighlight && highlights.findIndex((h) => h.id === id) >= 0) {
      setSelectedHighlight(highlights.find((h) => h.id === id));
      console.log(
        "selectedHighlight::highlights.find(h => h.id === id): ",
        highlights.find((h) => h.id === id)
      );
    }
    setNeedRefreshHighlights?.(true);
  };

  useEffect(() => {
    // Add the event listener when the component mounts
    window.addEventListener("hashchange", () => handleHashChange());

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("hashchange", () => handleHashChange());
    };
  }, [fileName]);

  useEffect(() => {
    const chatHistory =
      (JSON.parse(localStorage.getItem("chatStorage") || "[]") as FileStorage[])
        .find((s) => s.fileName === localStorage.getItem("fileName") || "")
        ?.histories.find((h) => h.highlightId === currHighlightId)
        ?.chatHistory || [];
    setChatHistory(chatHistory);
    const msgList: ChatGPTMessage[] = [];
    chatHistory.forEach((item) => {
      msgList.push({
        role: "user",
        content: item[0],
      });
      msgList.push({
        role: "assistant",
        content: item[1],
      });
    });
    setMessages(msgList);
  }, [currHighlightId]);

  const updateMessages = (message: ChatGPTMessage) => {
    setMessages((previousMessages) => [...previousMessages, message]);
    setTimeout(() => scrollToBottom(containerRef), 50);
  };

  const updateChatHistory = (question: string, answer: string) => {
    setChatHistory((previousHistory) => [
      ...previousHistory,
      [question, answer],
    ]);
  };

  const updateStreamingAIContent = (streamingAIContent: string) => {
    setStreamingAIContent(streamingAIContent);
    setTimeout(() => scrollToBottom(containerRef), 50);
  };

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        "tempChat",
        JSON.stringify({
          selectedText,
          chatHistory,
        })
      );
    }
  }, [isLoading]);

  useEffect(() => {
    if (showChat) {
      setTimeout(() => {
        (document.querySelector("#chat-box") as HTMLElement).focus();
      }, 500);
    }
  }, [showChat]);

  const handleStreamEnd = (
    question: string,
    streamingAIContent: string,
    sourceDocuments: string
  ) => {
    let sourceContents: DocumentInfo[] = [];
    if (sourceDocuments) {
      sourceContents = JSON.parse(sourceDocuments);
    }
    let sources: DocumentInfo[] = [];

    sourceContents.forEach((element) => {
      sources.push(element);
    });
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
  const sendQuestion = async (
    question: string,
    aiMode: "translate" | "chat" | "summarize" | "explain" = "chat"
  ) => {
    const endpoint = aiModeToEndpoint[aiMode];
    const actionText = aiModeToActionText[aiMode];

    setIsLoading(true);
    if (aiMode === "chat") {
      updateMessages({
        role: "user",
        content: question,
      });
    } else {
      updateMessages({
        role: "assistant",
        content: actionText,
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          phrase: selectedHighlight?.content.text,
          chatHistory,
          indexKey,
          ...(aiMode === "translate" && { language: "Chinese" }),
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
        if (text.includes("tokens-ended") && !tokensEnded) {
          tokensEnded = true;

          let texts = text.split("tokens-ended");
          if (texts.length > 1) {
            streamingAIContent = streamingAIContent + texts[0];
            updateStreamingAIContent(streamingAIContent);
          }
          if (texts.length > 2) {
            sourceDocuments += texts[1];
          }
        } else if (tokensEnded) {
          sourceDocuments += text;
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

  useEffect(() => {
    if (aiMode === "translate" && selectedText !== "") {
      setTimeout(() => {
        sendQuestion(selectedText, "translate");
      }, 500);
    }
    if (aiMode === "summarize" && selectedText !== "") {
      setTimeout(() => {
        sendQuestion(selectedText, "summarize");
      }, 500);
    }
    if (aiMode === "explain" && selectedText !== "") {
      setTimeout(() => {
        sendQuestion(selectedText, "explain");
      }, 500);
    }
  }, [aiMode, selectedText]);

  useEffect(() => {
    if (summary !== "") {
      updateMessages({
        role: "assistant",
        content: "Summary:\n" + summary,
      });
    }
  }, [summary]);

  useEffect(() => {
    if (!isLoading && chatHistory.length) {
      setTimeout(() => {
        saveCurrChat();
      }, 500);
    }
  }, [isLoading]);

  const saveCurrChat = () => {
    const highlightsCopy = [...highlights];
    const index = highlightsCopy.findIndex((h) => h.id === currHighlightId);
    setHighlights && setHighlights(highlightsCopy);

    let _storage: FileStorage[] = [];
    if (localStorage.getItem("chatStorage")) {
      _storage = JSON.parse(
        localStorage.getItem("chatStorage") || "[]"
      ) as FileStorage[];
    }
    const currFileStorage: FileStorage = _storage.find(
      (i) => i.fileName === localStorage.getItem("fileName")
    ) || {
      fileName: localStorage.getItem("fileName") || "",
      histories: [],
    };
    const historyItemIndex = currFileStorage?.histories.findIndex(
      (h) => h.highlightId === currHighlightId
    );
    const newHistoryItem: History = {
      highlight: {
        ...highlightsCopy.find((i) => i.id === currHighlightId),
        isSaved: true,
      } as IHighlight,
      highlightId: currHighlightId || "",
      chatHistory,
    };
    if (historyItemIndex >= 0 && currFileStorage?.histories) {
      currFileStorage.histories[historyItemIndex] = newHistoryItem;
    } else {
      currFileStorage?.histories.push(newHistoryItem);
    }
    console.log("currFileStorage: ", currFileStorage);
    if (currFileStorage) {
      const fileStorageIndex = _storage.findIndex(
        (i) => i.fileName === localStorage.getItem("fileName")
      );
      if (fileStorageIndex >= 0) {
        _storage[
          _storage.findIndex(
            (i) => i.fileName === localStorage.getItem("fileName")
          )
        ] = currFileStorage;
      } else {
        _storage.push(currFileStorage);
      }
      console.log("storage: ", _storage);
    }
    localStorage.setItem("chatStorage", JSON.stringify(_storage));
  };

  // useEffect(() => {
  //   let _storage: FileStorage[] = [];
  //   if (localStorage.getItem("chatStorage")) {
  //     _storage = JSON.parse(
  //       localStorage.getItem("chatStorage") || "[]"
  //     ) as FileStorage[];
  //   }
  // }, [highlights]);

  let placeholder = "Type a message to start ...";

  if (messages.length > 2) {
    placeholder = "Type to continue your conversation";
  }
  console.log("selectedHighlight: ", selectedHighlight);

  return (
    <div
      className="slide-in overflow-y-auto"
      style={{
        width: "20vw",
        padding: "12px 12px 0 12px",
        backgroundColor: "white",
        maxHeight: "100%",
      }}
    >
      {highlights.find((h) => h.id === currHighlightId)?.content?.text ? (
        <>
          <div className="text-black text-lg font-bold mb-1">Ask about...</div>
          <Paragraph
            ellipsis={{
              rows: 3,
              expandable: true,
              collapsible: true,
              expandText: "Show more",
              collapseText: "Show less",
            }}
            style={{ width: "100%", paddingBottom: 8 }}
          >
            {`"${
              highlights.find((h) => h.id === currHighlightId)?.content?.text
            }":`}
          </Paragraph>
        </>
      ) : (
        <>
          <div className="text-black text-lg font-bold">
            Select text from PDF,
          </div>
          <div className="flex text-black text-lg font-bold items-baseline">
            <div>and chat with</div>
            <div
              className="font-bold"
              style={{
                background: "linear-gradient(to right bottom, red, blue)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                marginLeft: 6,
                marginBottom: 8,
                fontSize: 20,
              }}
            >
              AI
            </div>
          </div>
        </>
      )}
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
      {/* <div className="text-black">{selectedText}</div> */}
      <div style={{ position: "sticky", bottom: 0, backgroundColor: "white" }}>
        <TextArea
          id="chat-box"
          className="mt-2"
          style={{
            backgroundColor: "rgba(var(--semi-grey-0), 1)",
            borderColor: "rgba(var(--semi-grey-1), 1)",
          }}
          value={userQuestion}
          rows={2}
          onChange={setUserQuestion}
          onEnterPress={(e) => {
            sendQuestion(`${userQuestion}`);
            setTimeout(() => {
              setUserQuestion("");
            }, 50);
          }}
        />
        <div className="flex justify-end mt-2">
          <Button
            theme="solid"
            type="primary"
            onClick={() => {
              sendQuestion(`${userQuestion}`);
              setTimeout(() => {
                setUserQuestion("");
              }, 50);
            }}
            disabled={isLoading || isAIBusy}
            style={{ backgroundColor: "black", color: "white" }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
