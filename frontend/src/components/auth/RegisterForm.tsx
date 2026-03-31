"use client";

import React from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Building2, Globe, Users, Briefcase, Phone } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { RegisterData, UserRole } from '@/types/auth.types';
import RoleSelector from './RoleSelector';
import SocialAuthButtons from './SocialAuthButtons';

interface RegisterFormProps {
    onSubmit: (data: RegisterData) => Promise<void>;
}

// Dynamic validation schema based on role
const getValidationSchema = (role: UserRole): Yup.ObjectSchema<any> => {
    const baseSchema = {
        email: Yup.string()
            .email('Invalid email address')
            .required('Email is required'),
        password: Yup.string()
            .min(8, 'Password must be at least 8 characters')
            .matches(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password must contain uppercase, lowercase, and number'
            )
            .required('Password is required'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password')], 'Passwords must match')
            .required('Please confirm your password'),
        role: Yup.string()
            .oneOf(['student', 'company', 'admin'], 'Invalid role')
            .required('Role is required'),
        agreeToTerms: Yup.boolean()
            .oneOf([true], 'You must agree to the terms and conditions')
            .required('You must agree to the terms and conditions')
    };

    if (role === 'company') {
        return Yup.object().shape({
            ...baseSchema,
            companyName: Yup.string()
                .min(2, 'Company name must be at least 2 characters')
                .required('Company name is required'),
            industry: Yup.string()
                .required('Industry is required'),
            companySize: Yup.string()
                .required('Company size is required'),
            website: Yup.string()
                .url('Please enter a valid URL (e.g., https://example.com)')
                .nullable(),
            phone: Yup.string()
                .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
                .nullable()
        });
    } else {
        return Yup.object().shape({
            ...baseSchema,
            name: Yup.string()
                .min(2, 'Name must be at least 2 characters')
                .required('Name is required')
        });
    }
};

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [currentRole, setCurrentRole] = React.useState<UserRole>('student');

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
        phone: ''
    };

    // Handler for form submission
    const handleFormSubmit = async (
        values: RegisterData,
        { setSubmitting, setErrors }: FormikHelpers<RegisterData>
    ): Promise<void> => {
        console.log(values)
        try {
            await onSubmit(values);
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.message) {
                setErrors({ email: error.message });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={getValidationSchema(currentRole)}
            onSubmit={handleFormSubmit}
            validateOnChange={true}
            validateOnBlur={true}
        >
            {({ values, setFieldValue, isSubmitting, errors, touched, setFieldTouched, validateForm }) => {
                // Update validation schema when role changes
                React.useEffect(() => {
                    if (values.role !== currentRole) {
                        setCurrentRole(values.role);
                        // Trigger revalidation after role change
                        setTimeout(() => validateForm(), 0);
                    }
                }, [values.role, currentRole, validateForm]);

                return (
                    <Form className="space-y-5">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-[#0F172A] mb-3">
                                I want to join as
                            </label>
                            <RoleSelector
                                selectedRole={values.role}
                                onRoleSelect={(role: UserRole) => {
                                    setFieldValue('role', role);
                                    setCurrentRole(role);
                                    // Reset validation when role changes
                                    Object.keys(errors).forEach(key => setFieldTouched(key, false));
                                }}
                            />
                            <ErrorMessage name="role" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                        </div>

                        {/* Conditional Fields Based on Role */}
                        {values.role === 'company' ? (
                            <>
                                {/* Company Name */}
                                <div>
                                    <label htmlFor="companyName" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                        Company Name
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                        <Field
                                            id="companyName"
                                            name="companyName"
                                            type="text"
                                            className={`
                                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                            text-[#0F172A] placeholder:text-[#94A3B8]
                                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                            transition-all duration-200
                                            ${errors.companyName && touched.companyName ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                        `}
                                            placeholder="TechCorp Inc."
                                        />
                                    </div>
                                    <ErrorMessage name="companyName" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                                </div>

                                {/* Industry */}
                                <div>
                                    <label htmlFor="industry" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                        Industry
                                    </label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                        <Field
                                            as="select"
                                            id="industry"
                                            name="industry"
                                            className={`
                                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                            text-[#0F172A] placeholder:text-[#94A3B8]
                                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                            transition-all duration-200
                                            ${errors.industry && touched.industry ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                        `}
                                        >
                                            <option value="">Select Industry</option>
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
                                    </div>
                                    <ErrorMessage name="industry" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                                </div>

                                {/* Company Size */}
                                <div>
                                    <label htmlFor="companySize" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                        Company Size
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                        <Field
                                            as="select"
                                            id="companySize"
                                            name="companySize"
                                            className={`
                                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                            text-[#0F172A] placeholder:text-[#94A3B8]
                                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                            transition-all duration-200
                                            ${errors.companySize && touched.companySize ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                        `}
                                        >
                                            <option value="">Select Company Size</option>
                                            <option value="1-10">1-10 employees</option>
                                            <option value="11-50">11-50 employees</option>
                                            <option value="51-200">51-200 employees</option>
                                            <option value="201-500">201-500 employees</option>
                                            <option value="501-1000">501-1000 employees</option>
                                            <option value="1000+">1000+ employees</option>
                                        </Field>
                                    </div>
                                    <ErrorMessage name="companySize" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                                </div>

                                {/* Website (Optional) */}
                                <div>
                                    <label htmlFor="website" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                        Website <span className="text-[#94A3B8] font-normal">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                        <Field
                                            id="website"
                                            name="website"
                                            type="url"
                                            className={`
                                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                            text-[#0F172A] placeholder:text-[#94A3B8]
                                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                            transition-all duration-200
                                            ${errors.website && touched.website ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                        `}
                                            placeholder="https://www.example.com"
                                        />
                                    </div>
                                    <ErrorMessage name="website" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                                </div>

                                {/* Phone (Optional) */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                        Phone Number <span className="text-[#94A3B8] font-normal">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                        <Field
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            className={`
                                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                            text-[#0F172A] placeholder:text-[#94A3B8]
                                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                            transition-all duration-200
                                            ${errors.phone && touched.phone ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                        `}
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                    <ErrorMessage name="phone" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                                </div>
                            </>
                        ) : (
                            /* Student/Admin Name Input */
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                    <Field
                                        id="name"
                                        name="name"
                                        type="text"
                                        className={`
                                        w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                        text-[#0F172A] placeholder:text-[#94A3B8]
                                        focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                        transition-all duration-200
                                        ${errors.name && touched.name ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                    `}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <ErrorMessage name="name" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                            </div>
                        )}

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                <Field
                                    id="email"
                                    name="email"
                                    type="email"
                                    className={`
                                    w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                    text-[#0F172A] placeholder:text-[#94A3B8]
                                    focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                    transition-all duration-200
                                    ${errors.email && touched.email ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                `}
                                    placeholder="you@example.com"
                                />
                            </div>
                            <ErrorMessage name="email" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                <Field
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`
                                    w-full pl-12 pr-12 py-3 bg-[#F8FAFC] border rounded-lg
                                    text-[#0F172A] placeholder:text-[#94A3B8]
                                    focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                    transition-all duration-200
                                    ${errors.password && touched.password ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                `}
                                    placeholder="Create a strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <ErrorMessage name="password" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0F172A] mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                <Field
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={`
                                    w-full pl-12 pr-12 py-3 bg-[#F8FAFC] border rounded-lg
                                    text-[#0F172A] placeholder:text-[#94A3B8]
                                    focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                    transition-all duration-200
                                    ${errors.confirmPassword && touched.confirmPassword ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                `}
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <ErrorMessage name="confirmPassword" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                        </div>

                        {/* Terms Checkbox */}
                        <div>
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <Field
                                    type="checkbox"
                                    name="agreeToTerms"
                                    className="mt-0.5 w-4 h-4 text-[#4F46E5] border-[#E2E8F0] rounded focus:ring-2 focus:ring-[#4F46E5] cursor-pointer"
                                />
                                <span className="text-sm text-[#64748B] leading-snug">
                                    I agree to the{' '}
                                    <Link href="/terms" className="text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors duration-200">
                                        Terms of Service
                                    </Link>
                                    {' '}and{' '}
                                    <Link href="/privacy" className="text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors duration-200">
                                        Privacy Policy
                                    </Link>
                                </span>
                            </label>
                            <ErrorMessage name="agreeToTerms" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>

                        {/* Social Auth Buttons */}
                        <SocialAuthButtons mode="register" />

                        {/* Sign In Link */}
                        <p className="text-center text-sm text-[#64748B]">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                            >
                                Sign in
                            </Link>
                        </p>
                    </Form>
                );
            }}
        </Formik>
    );
}
