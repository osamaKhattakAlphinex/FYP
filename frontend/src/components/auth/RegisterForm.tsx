'use client'

import React from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik'
import * as Yup from 'yup'
import { RegisterData, UserRole } from '@/types/auth.types'
import RoleSelector from './RoleSelector'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface RegisterFormProps {
    onSubmit: (data: RegisterData) => Promise<void>
}

const getValidationSchema = (role: UserRole): Yup.ObjectSchema<any> => {
    const baseSchema = {
        email: Yup.string().email('Invalid email address').required('Email is required'),
        password: Yup.string()
            .min(8, 'Password must be at least 8 characters')
            .matches(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Must contain uppercase, lowercase, and number'
            )
            .required('Password is required'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password')], 'Passwords must match')
            .required('Please confirm your password'),
        role: Yup.string()
            .oneOf(['student', 'company', 'admin'], 'Invalid role')
            .required('Role is required'),
        agreeToTerms: Yup.boolean()
            .oneOf([true], 'You must agree to the terms')
            .required('You must agree to the terms'),
    }

    if (role === 'company') {
        return Yup.object().shape({
            ...baseSchema,
            companyName: Yup.string().min(2).required('Company name is required'),
            industry: Yup.string().required('Industry is required'),
            companySize: Yup.string().required('Company size is required'),
            website: Yup.string().url('Enter a valid URL').nullable(),
            phone: Yup.string()
                .matches(
                    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                    'Invalid phone number'
                )
                .nullable(),
        })
    }

    return Yup.object().shape({
        ...baseSchema,
        name: Yup.string().min(2).required('Full name is required'),
    })
}

const inputClass = (hasError?: boolean) =>
    cn(
        'mt-1.5 flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition',
        hasError ? 'border-destructive' : 'border-input'
    )

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
    const [showPassword, setShowPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
    const [currentRole, setCurrentRole] = React.useState<UserRole>('student')

    const initialValues: RegisterData = {
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        name: '',
        agreeToTerms: false,
        companyName: '',
        industry: '',
        companySize: '',
        website: '',
        phone: '',
    }

    const handleFormSubmit = async (
        values: RegisterData,
        { setSubmitting, setErrors }: FormikHelpers<RegisterData>
    ): Promise<void> => {
        try {
            await onSubmit(values)
        } catch (error: any) {
            if (error.message) setErrors({ email: error.message })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={getValidationSchema(currentRole)}
            onSubmit={handleFormSubmit}
        >
            {({ values, setFieldValue, isSubmitting, errors, touched, setFieldTouched, validateForm }) => {
                React.useEffect(() => {
                    if (values.role !== currentRole) {
                        setCurrentRole(values.role)
                        setTimeout(() => validateForm(), 0)
                    }
                }, [values.role, currentRole, validateForm])

                return (
                    <Form className="space-y-5">
                        <div>
                            <Label className="mb-2 block">I want to join as</Label>
                            <RoleSelector
                                selectedRole={values.role}
                                onRoleSelect={(role) => {
                                    setFieldValue('role', role)
                                    setCurrentRole(role)
                                    Object.keys(errors).forEach((key) =>
                                        setFieldTouched(key, false)
                                    )
                                }}
                            />
                            <ErrorMessage
                                name="role"
                                component="p"
                                className="mt-1 text-xs text-destructive"
                            />
                        </div>

                        {values.role === 'company' ? (
                            <>
                                <div>
                                    <Label htmlFor="companyName">Company name</Label>
                                    <Field
                                        id="companyName"
                                        name="companyName"
                                        type="text"
                                        placeholder="TechCorp Inc."
                                        className={inputClass(
                                            !!(errors.companyName && touched.companyName)
                                        )}
                                    />
                                    <ErrorMessage
                                        name="companyName"
                                        component="p"
                                        className="mt-1 text-xs text-destructive"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="industry">Industry</Label>
                                        <Field
                                            as="select"
                                            id="industry"
                                            name="industry"
                                            className={inputClass(
                                                !!(errors.industry && touched.industry)
                                            )}
                                        >
                                            <option value="">Select…</option>
                                            <option value="Technology">Technology</option>
                                            <option value="Finance">Finance</option>
                                            <option value="Healthcare">Healthcare</option>
                                            <option value="Education">Education</option>
                                            <option value="E-commerce">E-commerce</option>
                                            <option value="Manufacturing">Manufacturing</option>
                                            <option value="Retail">Retail</option>
                                            <option value="Consulting">Consulting</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Real Estate">Real Estate</option>
                                            <option value="Other">Other</option>
                                        </Field>
                                        <ErrorMessage
                                            name="industry"
                                            component="p"
                                            className="mt-1 text-xs text-destructive"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="companySize">Company size</Label>
                                        <Field
                                            as="select"
                                            id="companySize"
                                            name="companySize"
                                            className={inputClass(
                                                !!(errors.companySize && touched.companySize)
                                            )}
                                        >
                                            <option value="">Select…</option>
                                            <option value="1-10">1–10</option>
                                            <option value="11-50">11–50</option>
                                            <option value="51-200">51–200</option>
                                            <option value="201-500">201–500</option>
                                            <option value="501-1000">501–1000</option>
                                            <option value="1000+">1000+</option>
                                        </Field>
                                        <ErrorMessage
                                            name="companySize"
                                            component="p"
                                            className="mt-1 text-xs text-destructive"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="website">
                                            Website{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Field
                                            id="website"
                                            name="website"
                                            type="url"
                                            placeholder="https://example.com"
                                            className={inputClass(
                                                !!(errors.website && touched.website)
                                            )}
                                        />
                                        <ErrorMessage
                                            name="website"
                                            component="p"
                                            className="mt-1 text-xs text-destructive"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="phone">
                                            Phone{' '}
                                            <span className="font-normal text-muted-foreground">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Field
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="+1 555 123 4567"
                                            className={inputClass(
                                                !!(errors.phone && touched.phone)
                                            )}
                                        />
                                        <ErrorMessage
                                            name="phone"
                                            component="p"
                                            className="mt-1 text-xs text-destructive"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <Label htmlFor="name">Full name</Label>
                                <Field
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="Jane Doe"
                                    className={inputClass(!!(errors.name && touched.name))}
                                />
                                <ErrorMessage
                                    name="name"
                                    component="p"
                                    className="mt-1 text-xs text-destructive"
                                />
                            </div>
                        )}

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Field
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                className={inputClass(!!(errors.email && touched.email))}
                            />
                            <ErrorMessage
                                name="email"
                                component="p"
                                className="mt-1 text-xs text-destructive"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">Password (8+ chars)</Label>
                            <div className="relative">
                                <Field
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    className={cn(
                                        inputClass(!!(errors.password && touched.password)),
                                        'pr-10'
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-[3px] text-muted-foreground hover:text-foreground"
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

                        <div>
                            <Label htmlFor="confirmPassword">Confirm password</Label>
                            <div className="relative">
                                <Field
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Re-enter password"
                                    className={cn(
                                        inputClass(
                                            !!(errors.confirmPassword && touched.confirmPassword)
                                        ),
                                        'pr-10'
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-[3px] text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <ErrorMessage
                                name="confirmPassword"
                                component="p"
                                className="mt-1 text-xs text-destructive"
                            />
                        </div>

                        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                            <Field
                                type="checkbox"
                                name="agreeToTerms"
                                className="mt-0.5 h-4 w-4 rounded border-input text-brand-600 focus:ring-2 focus:ring-ring"
                            />
                            <span className="text-muted-foreground">
                                I agree to the{' '}
                                <Link href="/terms" className="font-medium text-brand-600 hover:underline">
                                    Terms
                                </Link>{' '}
                                and{' '}
                                <Link
                                    href="/privacy"
                                    className="font-medium text-brand-600 hover:underline"
                                >
                                    Privacy Policy
                                </Link>
                                .
                            </span>
                        </label>
                        <ErrorMessage
                            name="agreeToTerms"
                            component="p"
                            className="-mt-3 text-xs text-destructive"
                        />

                        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating account…
                                </>
                            ) : (
                                'Agree & Join'
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already on NexIntern?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-brand-600 hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                    </Form>
                )
            }}
        </Formik>
    )
}
