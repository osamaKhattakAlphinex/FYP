"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/shared/Modal";
import { Loader2, Upload, X } from "lucide-react";
import { Certificate } from "@/types/student.types";

interface EditCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    certificate: Certificate | null;
    onSave: (data: Omit<Certificate, "id">, file?: File) => Promise<void>;
}

export default function EditCertificateModal({ isOpen, onClose, certificate, onSave }: EditCertificateModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        issuer: "",
        issueDate: "",
        expiryDate: null as string | null,
        credentialId: null as string | null,
        credentialUrl: null as string | null,
        certificateImage: null as string | null,
        isNexInternCertificate: false
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (certificate) {
            setFormData(certificate);
            if (certificate.certificateImage) {
                setPreviewUrl(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${certificate.certificateImage}`);
            }
        } else {
            setFormData({
                title: "",
                issuer: "",
                issueDate: "",
                expiryDate: null,
                credentialId: null,
                credentialUrl: null,
                certificateImage: null,
                isNexInternCertificate: false
            });
            setPreviewUrl(null);
        }
        setSelectedFile(null);
    }, [certificate, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl(certificate?.certificateImage ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${certificate.certificateImage}` : null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData, selectedFile || undefined);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={certificate ? "Edit Certificate" : "Add Certificate"} size="md">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Certificate Title" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <input type="text" required value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} placeholder="Issuing Organization" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <div className="grid grid-cols-2 gap-4">
                    <input type="date" required value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <input type="date" value={formData.expiryDate || ""} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || null })} placeholder="Expiry Date (optional)" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                </div>

                <input type="text" value={formData.credentialId || ""} onChange={(e) => setFormData({ ...formData, credentialId: e.target.value || null })} placeholder="Credential ID (optional)" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <input type="url" value={formData.credentialUrl || ""} onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value || null })} placeholder="Credential URL (optional)" className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />

                <div>
                    <label className="block text-sm font-semibold text-[#0F172A] mb-2">Certificate Image</label>
                    {previewUrl ? (
                        <div className="relative">
                            <img src={previewUrl} alt="Certificate preview" className="w-full h-48 object-cover rounded-lg border border-[#E2E8F0]" />
                            <button type="button" onClick={handleRemoveFile} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-[#FEE2E2] transition-colors">
                                <X className="w-4 h-4 text-[#EF4444]" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#E2E8F0] rounded-lg cursor-pointer hover:border-[#4F46E5] hover:bg-[#F8FAFC] transition-colors">
                            <Upload className="w-8 h-8 text-[#94A3B8] mb-2" />
                            <span className="text-sm text-[#64748B]">Click to upload certificate image</span>
                            <span className="text-xs text-[#94A3B8] mt-1">PNG, JPG or PDF (max 5MB)</span>
                            <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] font-medium rounded-lg hover:bg-[#F8FAFC]">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : certificate ? "Update" : "Add"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
