import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => Promise<void> | void; disabled?: boolean }) {
  const [text, setText] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const t = text.trim();
    setText("");
    try {
      await onSend(t);
    } catch (err) {
      // swallow; caller will handle errors
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 items-end">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message..." className="flex-1" />
      <Button type="submit" disabled={disabled || !text.trim()}>
        Send
      </Button>
    </form>
  );
}
