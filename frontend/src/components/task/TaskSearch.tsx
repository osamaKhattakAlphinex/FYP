"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface TaskSearchProps {
    onSearch: (query: string) => void;
    initialValue?: string;
    placeholder?: string;
    className?: string;
}

export default function TaskSearch({
    onSearch,
    initialValue = "",
    placeholder = "Search tasks...",
    className = ""
}: TaskSearchProps) {
    const [query, setQuery] = useState(initialValue);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query.trim());
    };

    const handleClear = () => {
        setQuery("");
        onSearch("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setQuery("");
            onSearch("");
        }
    };

    // Popular search suggestions
    const popularSearches = [
        "React Developer",
        "UI/UX Design",
        "Data Analysis",
        "Content Writing",
        "Python",
        "Digital Marketing"
    ];

    return (
        <div className={`relative ${className}`}>
            <form onSubmit={handleSubmit} className="relative">
                <div className={`relative flex items-center transition-all duration-200 ${isFocused
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'border-gray-300 hover:border-gray-400'
                    } border rounded-lg bg-white`}>
                    {/* Search Icon */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Input */}
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="block w-full pl-10 pr-12 py-3 border-0 rounded-lg focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500"
                    />

                    {/* Clear Button */}
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}

                    {/* Search Button */}
                    <button
                        type="submit"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                </div>
            </form>

            {/* Search Suggestions */}
            {isFocused && !query && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Popular Searches</h4>
                        <div className="flex flex-wrap gap-2">
                            {popularSearches.map((search) => (
                                <button
                                    key={search}
                                    onClick={() => {
                                        setQuery(search);
                                        onSearch(search);
                                        setIsFocused(false);
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <MagnifyingGlassIcon className="w-3 h-3 mr-1.5" />
                                    {search}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Search Results Preview (if query exists) */}
            {isFocused && query && query.length > 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                Press Enter to search for "{query}"
                            </span>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                                ↵
                            </kbd>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}