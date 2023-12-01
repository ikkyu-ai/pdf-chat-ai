"use client";

import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { Chat, FileStorage } from "@/components/chat";
import PdfDisplayer, { resetHash } from "./PdfDisplayer";
import { createContext, useEffect, useRef, useState } from "react";
import { Button, Layout } from "@douyinfe/semi-ui";
import { useHover } from "ahooks";
import { IHighlight, NewHighlight } from "./types/types";
import { updateHash } from "./Sidebar";
import { Spinner } from "./Spinner";
import logo from "../assets/LOGO.png";
import Image from "next/image";

export type PdfContextProps = {
  showChat: boolean;
  setShowChat?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedText: string;
  setSelectedText?: React.Dispatch<React.SetStateAction<string>>;
  aiMode: "chat" | "translate" | "summarize" | "explain";
  setAiMode?: React.Dispatch<
    React.SetStateAction<"chat" | "translate" | "summarize" | "explain">
  >;
  fileName: string;
  setFileName?: React.Dispatch<React.SetStateAction<string>>;
  indexKey: string;
  setIndexKey?: React.Dispatch<React.SetStateAction<string>>;
  highlights: IHighlight[];
  setHighlights?: React.Dispatch<React.SetStateAction<IHighlight[]>>;
  addHighlight?: (highlight: NewHighlight) => void;
  selectedHighlight?: IHighlight;
  setSelectedHighlight?: React.Dispatch<
    React.SetStateAction<IHighlight | undefined>
  >;
  summary: string;
  setSummary?: React.Dispatch<React.SetStateAction<string>>;
  isAIBusy: boolean;
  setIsAIBusy?: React.Dispatch<React.SetStateAction<boolean>>;
  storage: FileStorage[];
  needRefreshHighlights: boolean;
  setNeedRefreshHighlights?: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PdfContext = createContext<PdfContextProps>({
  showChat: false,
  setShowChat: undefined,
  selectedText: "",
  setSelectedText: undefined,
  aiMode: "chat",
  setAiMode: undefined,
  fileName: "",
  setFileName: undefined,
  indexKey: "",
  setIndexKey: undefined,
  highlights: [],
  setHighlights: undefined,
  addHighlight: undefined,
  selectedHighlight: undefined,
  setSelectedHighlight: undefined,
  summary: "",
  setSummary: undefined,
  isAIBusy: false,
  setIsAIBusy: undefined,
  storage: [],
  needRefreshHighlights: false,
  setNeedRefreshHighlights: undefined,
});

const getNextId = () => String(Math.random()).slice(2);

export const getHighlights = () => {
  const _storage = JSON.parse(
    localStorage.getItem("chatStorage") || "[]"
  ) as FileStorage[];
  const _highlights =
    _storage
      .find((i) => i.fileName === localStorage.getItem("fileName"))
      ?.histories.map((h) => h.highlight) || [];
  return _highlights;
};

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [aiMode, setAiMode] = useState<
    "chat" | "translate" | "summarize" | "explain"
  >("chat");
  const [fileName, setFileName] = useState<string>("");
  const [indexKey, setIndexKey] = useState<string>("");
  const [highlights, setHighlights] = useState<IHighlight[]>([]);
  const [summary, setSummary] = useState<string>("");
  const titleRef = useRef(null);
  const isHovering = useHover(titleRef);
  const [selectedHighlight, setSelectedHighlight] = useState<IHighlight>();
  const [isAIBusy, setIsAIBusy] = useState<boolean>(false);
  const [storage, setStorage] = useState<FileStorage[]>([]);
  const [needRefreshHighlights, setNeedRefreshHighlights] = useState(true);

  const loadHighlights = () => {
    const _storage = JSON.parse(
      localStorage.getItem("chatStorage") || "[]"
    ) as FileStorage[];
    setStorage(_storage);
    const _highlights =
      _storage
        .find((i) => i.fileName === fileName)
        ?.histories.map((h) => h.highlight) || [];
    setHighlights(_highlights);
  };

  useEffect(() => {
    resetHash();
    loadHighlights();
  }, [fileName]);

  useEffect(() => {
    if (needRefreshHighlights) {
      loadHighlights();
      setNeedRefreshHighlights(false);
    }
  }, [needRefreshHighlights]);

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    const newHighlight = { ...highlight, id: getNextId(), isSaved: true };
    updateHash(newHighlight);
    setSelectedHighlight({ ...newHighlight });
    const lS = JSON.parse(
      localStorage.getItem("chatStorage") || "[]"
    ) as FileStorage[];
    const fileIndex = lS.findIndex((i) => i.fileName === fileName);
    if (fileIndex >= 0) {
      const historiesCopy = [...lS[fileIndex].histories];
      historiesCopy.push({
        chatHistory: [],
        highlight: newHighlight,
        highlightId: newHighlight.id,
      });
      const lSCopy = [...lS];
      lSCopy[fileIndex].histories = historiesCopy;
      localStorage.setItem("chatStorage", JSON.stringify(lSCopy));
    } else {
      lS.push({
        fileName,
        histories: [
          {
            chatHistory: [],
            highlight: newHighlight,
            highlightId: newHighlight.id,
          },
        ],
      });
      localStorage.setItem("chatStorage", JSON.stringify(lS));
    }
    setHighlights([newHighlight, ...highlights]);
    setNeedRefreshHighlights(true);
    setTimeout(() => {
      setHighlights(getHighlights());
    }, 100);
  };

  return (
    <>
      <div
        ref={titleRef}
        className="flex justify-center items-center font-bold"
        style={{
          height: 48,
          backgroundColor: "black",
        }}
      >
        <Image
          src={logo}
          alt="logo"
          height={20}
          style={{ position: "fixed", top: 14, left: 16 }}
        />
        <div className="flex items-center px-20 py-2">
          {isAIBusy ? <Spinner /> : null}
          <div className="mr-3">{fileName}</div>
          {isHovering ? (
            <Button
              style={{ color: "rgba(255, 226, 143, 1)" }}
              onClick={() =>
                (
                  document.querySelector("#upload-pdf-input") as HTMLElement
                )?.click()
              }
            >
              Open New...
            </Button>
          ) : null}
        </div>
      </div>
      <main
        className="flex w-full"
        style={{
          height: "calc(100vh - 56px)",
          backgroundColor: "rgba(var(--semi-grey-0), 1)",
        }}
      >
        <PdfContext.Provider
          value={{
            showChat,
            setShowChat,
            selectedText,
            setSelectedText,
            aiMode,
            setAiMode,
            fileName,
            setFileName,
            indexKey,
            setIndexKey,
            highlights,
            setHighlights,
            addHighlight,
            selectedHighlight,
            setSelectedHighlight,
            summary,
            setSummary,
            isAIBusy,
            setIsAIBusy,
            storage,
            needRefreshHighlights,
            setNeedRefreshHighlights,
          }}
        >
          <PdfDisplayer
            highlights={highlights}
            setHighlights={setHighlights}
            setSelectedHighlight={setSelectedHighlight}
            addHighlight={addHighlight}
            setSummary={setSummary}
            isAIBusy={isAIBusy}
            setIsAIBusy={setIsAIBusy}
            storage={storage}
            setNeedRefreshHighlights={setNeedRefreshHighlights}
            needRefreshHighlights={needRefreshHighlights}
          />
          {fileName ? <Chat /> : null}
        </PdfContext.Provider>
      </main>
    </>
  );
}
