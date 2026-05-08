'use client'

import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
    length?: number
    onComplete: (otp: string) => void
    disabled?: boolean
}

export default function OtpInput({ length = 6, onComplete, disabled = false }: OtpInputProps) {
    const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const handleChange = (index: number, value: string) => {
        if (disabled) return
        if (value && !/^\d$/.test(value)) return
        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)
        if (value && index < length - 1) inputRefs.current[index + 1]?.focus()
        if (newOtp.every((d) => d !== '')) onComplete(newOtp.join(''))
    }

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return
        if (e.key === 'Backspace' && !otp[index] && index > 0)
            inputRefs.current[index - 1]?.focus()
        if (e.key === 'ArrowRight' && index < length - 1)
            inputRefs.current[index + 1]?.focus()
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text/plain').slice(0, length)
        if (!/^\d+$/.test(pastedData)) return
        const newOtp = [...otp]
        pastedData.split('').forEach((c, i) => {
            if (i < length) newOtp[i] = c
        })
        setOtp(newOtp)
        inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus()
        if (newOtp.every((d) => d !== '')) onComplete(newOtp.join(''))
    }

    return (
        <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={cn(
                        'h-12 w-10 sm:h-14 sm:w-12 rounded-md border bg-card text-center text-xl font-semibold transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-ring',
                        digit ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-input',
                        disabled && 'cursor-not-allowed opacity-50'
                    )}
                />
            ))}
        </div>
    )
}
