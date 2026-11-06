'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  Palette,
  Type,
  RotateCcw,
  RotateCw,
  Sparkles,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '@/lib/ThemeContext';

interface ReactRichTextEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  variables?: string[];
  placeholder?: string;
}

export default function ReactRichTextEditor({
  initialHtml,
  onChange,
  variables = [],
  placeholder = 'Start writing your email content here...',
}: ReactRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const savedSelectionRef = useRef<Range | null>(null);

  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [variableMenuOpen, setVariableMenuOpen] = useState(false);

  // Initialize editor content once or when template changes drastically
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      // If the incoming HTML is a full email document, extract the card/body inner content if possible, or render as-is
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  // Execute command safely
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  }, [onChange]);

  // Save selection before opening modal
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString() || 'Click here');
    } else {
      savedSelectionRef.current = null;
      setLinkText('Click here');
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  const openLinkModal = () => {
    saveSelection();
    setLinkModalOpen(true);
  };

  const insertLink = () => {
    restoreSelection();
    if (!linkUrl || linkUrl === 'https://') {
      setLinkModalOpen(false);
      return;
    }

    if (savedSelectionRef.current && savedSelectionRef.current.toString().length === 0) {
      // Insert new anchor with linkText
      const anchorHtml = `<a href="${linkUrl}" target="_blank" style="color: #0066FF; text-decoration: underline;">${linkText || linkUrl}</a>`;
      execCmd('insertHTML', anchorHtml);
    } else {
      execCmd('createLink', linkUrl);
    }

    setLinkModalOpen(false);
    setLinkUrl('https://');
    setLinkText('');
  };

  const insertVariable = (varName: string) => {
    const chipHtml = `<span style="background-color: rgba(0, 102, 255, 0.15); color: #0066FF; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; border: 1px solid rgba(0, 102, 255, 0.3);">{{${varName}}}</span>&nbsp;`;
    execCmd('insertHTML', chipHtml);
    setVariableMenuOpen(false);
  };

  const paletteColors = [
    '#ffffff',
    '#f3f4f6',
    '#9ca3af',
    '#0066FF',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#000000',
  ];

  return (
    <div className={clsx('rounded-2xl border flex flex-col overflow-hidden glass', isDark ? 'border-gray-800' : 'border-slate-200')}>
      {/* Editor Toolbar */}
      <div className={clsx('flex flex-wrap items-center gap-1 p-2 border-b select-none', isDark ? 'border-gray-800 bg-black/40' : 'border-slate-200 bg-slate-50')}>
        {/* History: Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => execCmd('undo')}
            title="Undo (Ctrl+Z)"
            className={clsx('p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors')}
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('redo')}
            title="Redo (Ctrl+Y)"
            className={clsx('p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors')}
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h1>')}
            title="Heading 1"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-0.5 text-xs font-bold"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h2>')}
            title="Heading 2"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-0.5 text-xs font-bold"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<p>')}
            title="Paragraph"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold px-2"
          >
            P
          </button>
        </div>

        {/* Inline styles: Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => execCmd('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors font-bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            title="Underline (Ctrl+U)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            title="Strikethrough"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Strikethrough size={14} />
          </button>
        </div>

        {/* Colors Picker */}
        <div className="relative px-1 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => setColorMenuOpen(!colorMenuOpen)}
            title="Text Color"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-[#0066FF] transition-colors flex items-center gap-1"
          >
            <Palette size={14} />
          </button>

          {colorMenuOpen && (
            <div
              className={clsx(
                'absolute top-full left-0 mt-1 p-2 rounded-xl border shadow-2xl z-30 flex gap-1.5 backdrop-blur-md',
                isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-300'
              )}
            >
              {paletteColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    execCmd('foreColor', color);
                    setColorMenuOpen(false);
                  }}
                  className="w-5 h-5 rounded-full border border-gray-600 transition-transform hover:scale-125"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Alignments: Left, Center, Right */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => execCmd('justifyLeft')}
            title="Align Left"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyCenter')}
            title="Align Center"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyRight')}
            title="Align Right"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <AlignRight size={14} />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            title="Numbered List"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<blockquote>')}
            title="Blockquote"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Quote size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertHorizontalRule')}
            title="Divider Line"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Minus size={14} />
          </button>
        </div>

        {/* Link Modal */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-700/50">
          <button
            type="button"
            onClick={openLinkModal}
            title="Insert Link"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-[#0066FF] transition-colors"
          >
            <LinkIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => execCmd('unlink')}
            title="Remove Link"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        {/* Dynamic Variable Chip Inserter */}
        <div className="relative px-1.5">
          <button
            type="button"
            onClick={() => setVariableMenuOpen(!variableMenuOpen)}
            className="px-2.5 py-1 rounded-lg bg-[#0066FF]/15 hover:bg-[#0066FF]/25 text-[#0066FF] border border-[#0066FF]/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Sparkles size={12} />
            <span>Insert Variable</span>
          </button>

          {variableMenuOpen && (
            <div
              className={clsx(
                'absolute top-full left-0 mt-1 w-56 max-h-56 overflow-y-auto p-1.5 rounded-xl border shadow-2xl z-30 backdrop-blur-md',
                isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-300'
              )}
            >
              <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1">Available Variables</div>
              {variables.map((varName) => (
                <button
                  key={varName}
                  type="button"
                  onClick={() => insertVariable(varName)}
                  className={clsx(
                    'w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between',
                    isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-slate-100 text-slate-800'
                  )}
                >
                  <span>{`{{${varName}}}`}</span>
                  <span className="text-[10px] text-[#0066FF] opacity-80">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={clsx(
          'p-6 min-h-[360px] max-h-[600px] overflow-y-auto outline-none transition-colors leading-relaxed font-sans text-sm',
          isDark
            ? 'bg-gray-950/70 text-gray-100 focus:bg-gray-950/90'
            : 'bg-white text-slate-900 focus:bg-slate-50/50'
        )}
        style={{ wordBreak: 'break-word' }}
        data-placeholder={placeholder}
      />

      {/* Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={clsx(
              'w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95',
              isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <LinkIcon size={16} className="text-[#0066FF]" /> Insert Link
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Link Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Open Groundwork"
                  className={clsx(
                    'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                    isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  )}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Destination URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className={clsx(
                    'w-full px-3 py-2 rounded-xl border text-xs outline-none',
                    isDark ? 'bg-black/30 border-gray-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0066dd] text-white text-xs font-bold shadow-md"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
