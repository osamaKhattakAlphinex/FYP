import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    children: ReactNode
}

export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    ...props
}: ButtonProps) {
    const baseClasses = 'font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'

    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-sm',
        secondary: 'bg-white border-2 border-slate-200 text-slate-900 hover:border-indigo-600 hover:text-indigo-600',
        outline: 'bg-transparent border-2 border-slate-600 text-white hover:border-white'
    }

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-5 py-2.5',
        lg: 'px-7 py-3.5'
    }

    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}