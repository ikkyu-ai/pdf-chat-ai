import React, { useContext, useEffect, useState } from "react";
import type { IHighlight } from "react-pdf-highlighter";
import { PdfContext } from "./page";
import { resetHash } from "./PdfDisplayer";
import { FileStorage } from "@/components/chat";

interface Props {
  // highlights: Array<IHighlight>;
  deleteHighlight: (id: string) => void;
  onFileOpen?: (file: File) => void;
}

export const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};

declare const APP_VERSION: string;

export function Sidebar({
  deleteHighlight,
  onFileOpen,
}: Props): React.ReactElement {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    setFileName,
    setIndexKey,
    setNeedRefreshHighlights,
    highlights,
    needRefreshHighlights,
    fileName,
  } = useContext(PdfContext);

  const [_hl, setHl] = useState<IHighlight[]>([]);
  const [retrieveTrigger, setRetrieveTrigger] = useState(1);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    console.log(selectedFile);
    setFileName?.(selectedFile.name);
    const key = selectedFile.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    setIndexKey?.(key);
    onFileOpen?.(selectedFile);
    localStorage.setItem("fileName", selectedFile.name);
  }, [selectedFile]);

  useEffect(() => {
    const temp =
      (JSON.parse(localStorage.getItem("chatStorage") || "[]") as FileStorage[])
        .find((i) => i.fileName === localStorage.getItem("fileName"))
        ?.histories.map((h) => h.highlight) || [];
    setHl(temp);
  }, [retrieveTrigger, needRefreshHighlights]);

  return (
    <div
      className="sidebar"
      style={
        fileName ? { width: "20vw" } : { visibility: "hidden", width: "20vw" }
      }
    >
      <div>
        <input
          className="hidden"
          id="upload-pdf-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelection}
        />
      </div>
      {/* {highlights.length > 0 ? (
        <div style={{ padding: "1rem" }}>
          <button onClick={resetHighlights}>Reset highlights</button>
        </div>
      ) : null} */}
      {_hl.length > 0 ? (
        <div
          className="p-4 font-bold text-xl sticky top-0 z-50 w-full"
          style={{ backgroundColor: "rgba(var(--semi-grey-0), 1)" }}
        >
          Annotations
        </div>
      ) : null}

      <div className="sidebar__highlights">
        {_hl.map((highlight, index) => (
          <div
            key={index}
            className="sidebar__highlight"
            onClick={() => {
              updateHash(highlight);
            }}
          >
            <div>
              <strong>{highlight?.comment?.text}</strong>
              {highlight?.content?.text ? (
                <blockquote style={{ marginTop: "0.5rem" }}>
                  {`${highlight.content.text.slice(0, 90).trim()}…`}
                </blockquote>
              ) : null}
              {highlight?.content?.image ? (
                <div
                  className="highlight__image"
                  style={{ marginTop: "0.5rem" }}
                >
                  <img src={highlight.content.image} alt={"Screenshot"} />
                </div>
              ) : null}
            </div>
            <div className="highlight__location">
              <div
                className="relative top-3"
                style={{ color: "rgba(var(--semi-grey-4), 1)" }}
                onClick={() => {
                  deleteHighlight(highlight.id);
                  setNeedRefreshHighlights?.(true);
                  setRetrieveTrigger(retrieveTrigger + 1);
                  setTimeout(() => {
                    resetHash();
                  }, 100);
                }}
              >
                Delete
              </div>
              Page {highlight?.position?.pageNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
