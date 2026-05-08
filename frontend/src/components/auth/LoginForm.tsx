'use client'

import React from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik'
import * as Yup from 'yup'
import { LoginCredentials } from '@/types/auth.types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface LoginFormProps {
    onSubmit: (credentials: LoginCredentials) => Promise<void>
}

const loginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
})

export default function LoginForm({ onSubmit }: LoginFormProps) {
    const [showPassword, setShowPassword] = React.useState(false)

    const initialValues: Omit<LoginCredentials, 'role'> = { email: '', password: '' }

    const handleFormSubmit = async (
        values: Omit<LoginCredentials, 'role'>,
        { setSubmitting, setErrors }: FormikHelpers<Omit<LoginCredentials, 'role'>>
    ): Promise<void> => {
        try {
            await onSubmit(values as LoginCredentials)
        } catch (error: any) {
            if (error.message) setErrors({ email: error.message })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleFormSubmit}
        >
            {({ isSubmitting, errors, touched }) => (
                <Form className="space-y-5">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Field
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            className={cn(
                                'mt-1.5 flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition',
                                errors.email && touched.email ? 'border-destructive' : 'border-input'
                            )}
                        />
                        <ErrorMessage
                            name="email"
                            component="p"
                            className="mt-1 text-xs text-destructive"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-brand-600 hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative mt-1.5">
                            <Field
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                className={cn(
                                    'flex h-10 w-full rounded-md border bg-card px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition',
                                    errors.password && touched.password
                                        ? 'border-destructive'
                                        : 'border-input'
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <ErrorMessage
                            name="password"
                            component="p"
                            className="mt-1 text-xs text-destructive"
                        />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing in…
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        New to NexIntern?{' '}
                        <Link
                            href="/register"
                            className="font-semibold text-brand-600 hover:underline"
                        >
                            Join now
                        </Link>
                    </p>
                </Form>
            )}
        </Formik>
    )
}
