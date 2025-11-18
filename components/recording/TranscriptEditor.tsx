"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline"; // <-- Import Underline extension
import TextAlign from "@tiptap/extension-text-align"; // <-- Import TextAlign extension
import { saveAs } from "file-saver";
// @ts-ignore
import htmlDocx from "html-docx-js/dist/html-docx";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
} from "lucide-react";

interface TranscriptEditorProps {
  content: string;
}

export default function TranscriptEditor({ content }: TranscriptEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension, // add underline support
      TextAlign.configure({
        // add text alignment support
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
  });

  if (!editor) {
    return null;
  }

  const exportToWord = () => {
    // Get the HTML content from the TipTap editor.
    const htmlContent = editor.getHTML();

    // Wrap the content in a full HTML document with basic styling if needed.
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Transcript</title>
    <style>
      /* Additional styles for Word */
      body { font-family: Arial, sans-serif; }
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`;

    // Convert the HTML string into a DOCX blob.
    const converted = htmlDocx.asBlob(html);
    // Trigger the download using FileSaver.
    saveAs(converted, "transcript.docx");
  };

  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      icon: Underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
    },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      icon: AlignLeft,
      action: () => editor.chain().focus().setTextAlign("left").run(),
      isActive: editor.isActive({ textAlign: "left" }),
    },
    {
      icon: AlignCenter,
      action: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: editor.isActive({ textAlign: "center" }),
    },
    {
      icon: AlignRight,
      action: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: editor.isActive({ textAlign: "right" }),
    },
  ];

  return (
    <div className="border rounded-lg">
      <div className="border-b p-2 flex items-center space-x-1">
        {tools.map((tool, index) => (
          <button
            key={index}
            onClick={tool.action}
            className={`p-2 rounded hover:bg-gray-100 ${
              tool.isActive ? "bg-gray-100" : ""
            }`}>
            <tool.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[200px]" />
      <div className="p-4">
        <button
          onClick={exportToWord}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
          Export to Word
        </button>
      </div>
    </div>
  );
}
