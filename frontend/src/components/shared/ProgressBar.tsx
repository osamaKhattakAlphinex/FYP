"use client";

interface ProgressBarProps {
    value?: number;
    progress?: number;
    max?: number;
    className?: string;
    color?: string;
    trackColor?: string;
}

export default function ProgressBar({
    value,
    progress,
    max = 100,
    className = "",
    color = "#4F46E5",
    trackColor = "#C7D2FE"
}: ProgressBarProps) {
    const actualValue = value !== undefined ? value : (progress !== undefined ? progress : 0);
    const percentage = Math.min(Math.max((actualValue / max) * 100, 0), 100);

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative w-60 h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
                <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color }}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
}
