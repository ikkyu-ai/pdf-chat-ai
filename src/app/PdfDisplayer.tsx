"use client";

import React, { Component } from "react";

import { PdfLoader, AreaHighlight, Popup } from "react-pdf-highlighter";
import { Highlight } from "./components/Highlight";
import Tip from "./components/Tip";

// import type { IHighlight, NewHighlight } from "react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import { testHighlights as _testHighlights } from "./test-highlights";

import "./style/App.css";
import { PdfHighlighter } from "./components/PdfHighlighter";
import { PdfContext, getHighlights } from "./page";
import { IHighlight, NewHighlight } from "./types/types";
import { FileStorage } from "@/components/chat";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

interface State {
  url: string;
}

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

export const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

// https://arxiv.org/pdf/1708.08021.pdf
const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021.pdf";
// const PRIMARY_PDF_URL = "file:///Users/bytedance/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480.pdf";

const searchParams = new URLSearchParams(document.location.search);

const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

class PdfDisplayer extends Component<
  {
    highlights: IHighlight[];
    setHighlights: React.Dispatch<React.SetStateAction<IHighlight[]>>;
    setSelectedHighlight: React.Dispatch<
      React.SetStateAction<IHighlight | undefined>
    >;
    addHighlight?: ((highlight: NewHighlight) => void) | undefined;
    setSummary?: React.Dispatch<React.SetStateAction<string>>;
    isAIBusy: boolean;
    setIsAIBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    storage: FileStorage[];
    needRefreshHighlights: boolean;
    setNeedRefreshHighlights: React.Dispatch<React.SetStateAction<boolean>>;
  },
  State
> {
  state = {
    url: initialUrl,
  };

  deleteHighlight = (id: string) => {
    const _storage = JSON.parse(localStorage.getItem("chatStorage") || "[]");
    const fileName = localStorage.getItem("fileName") || "";
    const fileIndex = _storage.findIndex((s) => s.fileName === fileName);
    if (fileIndex >= 0) {
      const remaining = _storage[fileIndex].histories.filter(
        (h) => h.highlightId !== id
      );
      const newFileStorage: FileStorage = {
        fileName,
        histories: remaining,
      };
      const storageCopy = [..._storage];
      storageCopy[fileIndex] = newFileStorage;
      localStorage.setItem("chatStorage", JSON.stringify(storageCopy));
      this.props.setHighlights(getHighlights());
      this.props.setNeedRefreshHighlights(true);
      resetHash();
    }
  };

  handleOpenFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    this.setState({
      url: url,
    });
    const key = file.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);
    try {
      this.props.setIsAIBusy?.(true);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      // const reader = response?.body?.getReader();
      // let streamingSummary = "";
      // let tokensEnded = false;
      // while (true) {
      //   const { done, value } = (await reader?.read()) || {};
      //   if (done) {
      //     break;
      //   }
      //   const text = new TextDecoder().decode(value);
      //   if (text.includes("tokens-ended") && !tokensEnded) {
      //     tokensEnded = true;
      //     let texts = text.split("tokens-ended");
      //     if (texts.length > 1) {
      //       streamingSummary = streamingSummary + texts[0];
      //     }
      //   } else {
      //     streamingSummary = streamingSummary + text;
      //   }
      // }
      // console.log("streaming summary", streamingSummary);
      // this.props.setSummary?.(streamingSummary);
    } catch (err) {
      console.log(err);
    } finally {
      this.props.setIsAIBusy?.(false);
    }
  };

  scrollViewerTo = (highlight: any) => {};

  scrollToHighlightFromHash = () => {
    const highlight = this.getHighlightById(parseIdFromHash());

    if (highlight) {
      this.scrollViewerTo(highlight);
    }
  };

  componentDidMount() {
    window.addEventListener(
      "hashchange",
      this.scrollToHighlightFromHash,
      false
    );
  }

  getHighlightById(id: string) {
    const { highlights } = this.props;

    return highlights.find((highlight) => highlight.id === id);
  }

  updateHighlight(highlightId: string, position: Object, content: Object) {
    console.log("Updating highlight", highlightId, position, content);

    this.props.setHighlights(
      this.props.highlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      })
    );
  }

  render() {
    const { url } = this.state;
    const {
      highlights,
      setHighlights,
      setSelectedHighlight,
      setSummary,
      needRefreshHighlights,
    } = this.props;

    return (
      <div className="App" style={{ display: "flex", height: "100%" }}>
        <Sidebar
          deleteHighlight={this.deleteHighlight}
          onFileOpen={this.handleOpenFile}
        />
        <div
          style={{
            height: "100%",
            width: "60vw",
            position: "relative",
          }}
        >
          <PdfLoader url={url} beforeLoad={<Spinner />}>
            {(pdfDocument) => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey}
                onScrollChange={resetHash}
                pdfScaleValue="auto"
                scrollRef={(scrollTo) => {
                  this.scrollViewerTo = scrollTo;

                  this.scrollToHighlightFromHash();
                }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      const tempHighlight = { content, position, comment };
                      this.props.addHighlight?.(tempHighlight);
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isTextHighlight = !Boolean(
                    highlight.content && highlight.content.image
                  );

                  const component = isTextHighlight ? (
                    <Highlight
                      highlight={highlight}
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={(boundingRect) => {
                        this.updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<HighlightPopup {...highlight} />}
                      onMouseOver={(popupContent) =>
                        setTip(highlight, (highlight) => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                    >
                      {component}
                    </Popup>
                  );
                }}
                highlights={[...highlights]}
              />
            )}
          </PdfLoader>
        </div>
      </div>
    );
  }
}

export default PdfDisplayer;
