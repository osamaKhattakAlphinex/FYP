"use client";

import { X } from "lucide-react";
import { useState, KeyboardEvent, useRef, useEffect } from "react";

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder: string;
    suggestions?: string[];
    maxTags?: number;
}

export default function TagInput({
    tags,
    onChange,
    placeholder,
    suggestions = [],
    maxTags,
}: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (inputValue.trim()) {
            const filtered = suggestions.filter(
                (s) =>
                    s.toLowerCase().includes(inputValue.toLowerCase()) &&
                    !tags.includes(s)
            );
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [inputValue, suggestions, tags]);

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (
            trimmedTag &&
            !tags.includes(trimmedTag) &&
            (!maxTags || tags.length < maxTags)
        ) {
            onChange([...tags, trimmedTag]);
            setInputValue("");
            setShowSuggestions(false);
        }
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                className="min-h-[48px] p-2 border border-input rounded-lg bg-white cursor-text flex flex-wrap gap-1.5 focus-within:border-[#4F46E5] focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.1)] transition-all duration-200"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 text-brand-700 text-[13px] font-medium rounded-md"
                    >
                        {tag}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="hover:bg-black/10 rounded transition-colors duration-150"
                            aria-label={`Remove ${tag}`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    disabled={maxTags ? tags.length >= maxTags : false}
                    className="flex-1 min-w-[120px] text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed"
                />
            </div>
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-lg shadow-md max-h-[200px] overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => addTag(suggestion)}
                            className="w-full px-3.5 py-2 text-left text-sm text-foreground hover:bg-muted/40 transition-colors duration-150"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
