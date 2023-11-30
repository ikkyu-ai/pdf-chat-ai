import React, {
  Component,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Popover } from "@douyinfe/semi-ui";
import { IconAlignCenterVertical, IconCustomerSupport, IconEdit, IconLanguage, IconQuote } from "@douyinfe/semi-icons";
import { PdfContext } from "@/app/page";

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
  const { setShowChat, setSelectedText, setAiMode } = useContext(PdfContext);
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
          icon={<IconAlignCenterVertical />}
          className="mr-1"
          onClick={() => onClickAction('summarize')}
        >
          Summarize
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<IconQuote />}
          className="mr-1"
          onClick={() => onClickAction('explain')}
        >
          Explain
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<IconLanguage />}
          className="mr-1"
          onClick={() => onClickAction('translate')}
        >
          Translate
        </Button>
        <Button
          theme="borderless"
          type="tertiary"
          size="small"
          icon={<IconEdit />}
          onClick={() => onClickAction('chat')}
        >
          Ask AI
        </Button>
      </div>
    </div>
  );
};

export default Tip;
