"use client";

import { X, Loader2 } from "lucide-react";
import { ReactNode, useEffect } from "react";

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    onSubmit: () => void;
    isLoading?: boolean;
    children: ReactNode;
}

export default function EditModal({
    isOpen,
    onClose,
    title,
    onSubmit,
    isLoading = false,
    children,
}: EditModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-[20px] w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-7 py-6 border-b border-[#E2E8F0]">
                    <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-[#F8FAFC] rounded-lg hover:bg-[#E2E8F0] transition-colors duration-200"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4 text-[#475569]" />
                    </button>
                </div>
                <div className="px-7 py-6">{children}</div>
                <div className="flex items-center justify-end gap-2.5 px-7 py-5 border-t border-[#E2E8F0]">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors duration-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-lg hover:bg-[#4338CA] transition-colors duration-200 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
