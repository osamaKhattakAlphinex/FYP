"use client";

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    error?: string;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing...',
    maxLength = 5000,
    error
}: RichTextEditorProps) {
    const quillRef = useRef<any>(null);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link'],
            ['clean']
        ],
        clipboard: {
            // Allow pasting with formatting
            matchVisual: false
        }
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'indent',
        'link',
        'color', 'background'
    ];

    const handleChange = (content: string) => {
        // Get plain text length for validation
        const plainText = content.replace(/<[^>]*>/g, '').trim();

        if (plainText.length <= maxLength) {
            onChange(content);
        }
    };

    // Get character count (plain text only)
    const getCharCount = () => {
        const plainText = value.replace(/<[^>]*>/g, '').trim();
        return plainText.length;
    };

    return (
        <div className="rich-text-editor">
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className="bg-white"
            />
            <div className="flex items-center justify-between mt-2">
                {error ? (
                    <p className="text-xs text-[#EF4444] flex items-center gap-1">
                        <span>⚠</span> {error}
                    </p>
                ) : (
                    <span />
                )}
                <span className="text-xs text-[#94A3B8]">
                    {getCharCount()}/{maxLength} characters
                </span>
            </div>

            <style jsx global>{`
                .rich-text-editor .ql-container {
                    min-height: 200px;
                    font-size: 14px;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                }
                
                .rich-text-editor .ql-toolbar {
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                    background-color: #F8FAFC;
                    border-color: #E2E8F0;
                }
                
                .rich-text-editor .ql-container {
                    border-color: #E2E8F0;
                }
                
                .rich-text-editor .ql-editor {
                    min-height: 200px;
                }
                
                .rich-text-editor .ql-editor.ql-blank::before {
                    color: #94A3B8;
                    font-style: normal;
                }
                
                .rich-text-editor .ql-stroke {
                    stroke: #475569;
                }
                
                .rich-text-editor .ql-fill {
                    fill: #475569;
                }
                
                .rich-text-editor .ql-picker-label {
                    color: #475569;
                }
                
                .rich-text-editor .ql-toolbar button:hover,
                .rich-text-editor .ql-toolbar button:focus,
                .rich-text-editor .ql-toolbar button.ql-active {
                    color: #4F46E5;
                }
                
                .rich-text-editor .ql-toolbar button:hover .ql-stroke,
                .rich-text-editor .ql-toolbar button:focus .ql-stroke,
                .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
                    stroke: #4F46E5;
                }
                
                .rich-text-editor .ql-toolbar button:hover .ql-fill,
                .rich-text-editor .ql-toolbar button:focus .ql-fill,
                .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
                    fill: #4F46E5;
                }
                
                .rich-text-editor .ql-editor h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin-bottom: 0.5em;
                }
                
                .rich-text-editor .ql-editor h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin-bottom: 0.5em;
                }
                
                .rich-text-editor .ql-editor h3 {
                    font-size: 1.25em;
                    font-weight: bold;
                    margin-bottom: 0.5em;
                }
                
                .rich-text-editor .ql-editor ul,
                .rich-text-editor .ql-editor ol {
                    padding-left: 1.5em;
                    margin-bottom: 0.5em;
                }
                
                .rich-text-editor .ql-editor a {
                    color: #4F46E5;
                    text-decoration: underline;
                }
                
                /* Color picker styles */
                .rich-text-editor .ql-picker.ql-color .ql-picker-label,
                .rich-text-editor .ql-picker.ql-background .ql-picker-label {
                    padding: 2px 4px;
                }
                
                .rich-text-editor .ql-color-picker .ql-picker-options {
                    padding: 3px 5px;
                    width: 152px;
                }
                
                .rich-text-editor .ql-color-picker .ql-picker-item {
                    border: 1px solid transparent;
                    float: left;
                    height: 16px;
                    margin: 2px;
                    padding: 0;
                    width: 16px;
                }
            `}</style>
        </div>
    );
}
