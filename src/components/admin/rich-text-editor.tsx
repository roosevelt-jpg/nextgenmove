"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] px-3 py-2 text-sm text-text-primary outline-none prose prose-sm max-w-none",
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next && editor.isEmpty && !next) return;
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-label"
        >
          {label}
        </label>
      ) : null}
      <div className="overflow-hidden rounded-radius-sm border border-border bg-surface-1">
        <div className="flex flex-wrap gap-1 border-b border-border bg-surface-2 px-2 py-1.5">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="B"
          />
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
          />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="•"
          />
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="1."
          />
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            label="H2"
          />
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-radius-sm px-2 py-0.5 font-mono text-[11px] font-semibold",
        active
          ? "bg-bg-purple text-fill-accent"
          : "bg-transparent text-text-secondary hover:bg-surface-1",
      )}
    >
      {label}
    </button>
  );
}
