"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border rounded-md", className)}>
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 pr-2 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("bold") && "bg-muted"
              )}
              title="Bold">
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("italic") && "bg-muted"
              )}
              title="Italic">
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("underline") && "bg-muted"
              )}
              title="Underline">
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("strike") && "bg-muted"
              )}
              title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("code") && "bg-muted"
              )}
              title="Code">
              <Code className="h-4 w-4" />
            </Button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 pr-2 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("heading", { level: 1 }) && "bg-muted"
              )}
              title="Heading 1">
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("heading", { level: 2 }) && "bg-muted"
              )}
              title="Heading 2">
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("heading", { level: 3 }) && "bg-muted"
              )}
              title="Heading 3">
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 pr-2 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("bulletList") && "bg-muted"
              )}
              title="Bullet List">
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("orderedList") && "bg-muted"
              )}
              title="Numbered List">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("blockquote") && "bg-muted"
              )}
              title="Quote">
              <Quote className="h-4 w-4" />
            </Button>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1 pr-2 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive({ textAlign: "left" }) && "bg-muted"
              )}
              title="Align Left">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive({ textAlign: "center" }) && "bg-muted"
              )}
              title="Align Center">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive({ textAlign: "right" }) && "bg-muted"
              )}
              title="Align Right">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive({ textAlign: "justify" }) && "bg-muted"
              )}
              title="Justify">
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-1 pr-2 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={setLink}
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("link") && "bg-muted"
              )}
              title="Add Link">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo">
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          "overflow-auto",
          editable ? "min-h-[400px] max-h-[600px]" : ""
        )}
      />
    </div>
  );
}
