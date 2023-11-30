import React, {
  Component,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Popover } from "@douyinfe/semi-ui";
import { IconAlignCenterVertical, IconCustomerSupport, IconEdit, IconLanguage, IconQuote } from "@douyinfe/semi-icons";
import { PdfContext, getHighlights } from "@/app/page";

import "../style/Tip.css";

interface State {
  compact: boolean;
  text: string;
  emoji: string;
}

interface TipProps {
  onConfirm: (comment: { text: string; emoji: string }) => void;
  onOpen: () => void;
  onUpdate?: () => void;
}

const Tip = ({ onConfirm, onOpen, onUpdate }: TipProps) => {
  const { setShowChat, setSelectedText, setAiMode, setHighlights } = useContext(PdfContext);
  const [state, setState] = useState({
    compact: true,
    text: "",
    emoji: "",
  });

  const prevState = useRef(state);

  useEffect(() => {
    if (onUpdate && prevState.current.compact !== state.compact) {
      onUpdate();
    }
    prevState.current = state;
  }, [state, onUpdate]);

  const { compact, text, emoji } = state;

  const onClickAction = (aiMode: 'chat' | 'translate' | 'summarize' | 'explain') => {
    setAiMode?.(aiMode);
    setShowChat?.(true);
    setSelectedText?.(window.getSelection()?.toString() || "");
    onOpen();
    onConfirm({
      text: '',
      emoji: '',
    });
    setHighlights?.(getHighlights());
    setState((prevState) => ({ ...prevState, compact: false }));
  };

  return (
    <div className="Tip">
      <div
        className="Tip__compact"
      >    
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          style={{ color: 'black', padding: '4px 8px' }}
          icon={<IconAlignCenterVertical />}
          onClick={() => onClickAction('summarize')}
        >
          Summarize
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<IconQuote />}
          style={{ color: 'black', padding: '4px 8px' }}
          onClick={() => onClickAction('explain')}
        >
          Explain
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<IconLanguage />}
          style={{ color: 'black', padding: '4px 8px' }}
          onClick={() => onClickAction('translate')}
        >
          Translate
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          style={{ color: 'black', padding: '4px 8px' }}
          onClick={() => onClickAction('chat')}
        >
          <div className="flex items-center">
            <div
                className="font-bold"
                style={{
                  background: "linear-gradient(to right bottom, red, blue)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  fontSize: 16,
                  marginRight: 8,
                }}
              >
                AI
              </div>
              Chat
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Tip;
