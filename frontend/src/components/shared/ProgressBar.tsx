"use client";

interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
}

export default function ProgressBar({ value, max = 100, className = "" }: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative w-60 h-2 bg-[#C7D2FE] rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-[#4F46E5] rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-[13px] font-semibold text-[#4F46E5] whitespace-nowrap">
                {Math.round(percentage)}%
            </span>
        </div>
    );
}
