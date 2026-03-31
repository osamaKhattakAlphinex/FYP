"use client";

import { Award, Calendar, ExternalLink, MoreVertical } from "lucide-react";
import { useState } from "react";
import SectionCard from "@/components/shared/SectionCard";
import EmptyState from "@/components/shared/EmptyState";
import { Certificate } from "@/types/student.types";

interface CertificatesSectionProps {
    certificates: Certificate[];
    onEdit: (cert: Certificate) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

export default function CertificatesSection({
    certificates,
    onEdit,
    onDelete,
    onAdd,
}: CertificatesSectionProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
        });
    };

    return (
        <SectionCard
            title="Certificates & Achievements"
            icon={Award}
            onEdit={onAdd}
            isEmpty={certificates.length === 0}
        >
            {certificates.length > 0 ? (
                <div className="space-y-5">
                    {certificates.map((cert, index) => (
                        <div key={cert.id}>
                            <div className="flex gap-4">
                                <div className="relative flex-shrink-0">
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${cert.isNexInternCertificate
                                                ? "bg-gradient-to-br from-[#4F46E5] to-[#06B6D4]"
                                                : "bg-[#F8FAFC] border border-[#E2E8F0]"
                                            }`}
                                    >
                                        <Award
                                            className={`w-5 h-5 ${cert.isNexInternCertificate ? "text-white" : "text-[#94A3B8]"
                                                }`}
                                        />
                                    </div>
                                    {cert.isNexInternCertificate && (
                                        <p className="text-[10px] font-semibold text-[#4F46E5] text-center mt-1">
                                            NexIntern
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-[15px] font-semibold text-[#0F172A]">
                                                    {cert.title}
                                                </h3>
                                                {cert.isNexInternCertificate && (
                                                    <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-medium rounded-full">
                                                        Verified by NexIntern ✓
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[13px] text-[#475569] mt-0.5">{cert.issuer}</p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() =>
                                                    setOpenMenuId(openMenuId === cert.id ? null : cert.id)
                                                }
                                                className="p-1.5 hover:bg-[#F8FAFC] rounded-lg transition-colors duration-200"
                                                aria-label="Options"
                                            >
                                                <MoreVertical className="w-4 h-4 text-[#94A3B8]" />
                                            </button>
                                            {openMenuId === cert.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenMenuId(null)}
                                                    />
                                                    <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-lg shadow-md py-1 min-w-[120px]">
                                                        <button
                                                            onClick={() => {
                                                                onEdit(cert);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC] transition-colors duration-150"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onDelete(cert.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors duration-150"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-[#94A3B8]">
                                        <Calendar className="w-3 h-3" />
                                        <span>Issued: {formatDate(cert.issueDate)}</span>
                                        {cert.expiryDate && (
                                            <>
                                                <span>·</span>
                                                <span>Expires: {formatDate(cert.expiryDate)}</span>
                                            </>
                                        )}
                                        {!cert.expiryDate && (
                                            <>
                                                <span>·</span>
                                                <span>No Expiry</span>
                                            </>
                                        )}
                                    </div>
                                    {cert.credentialId && (
                                        <p className="mt-1.5 text-xs text-[#94A3B8]">
                                            ID: {cert.credentialId}
                                        </p>
                                    )}
                                    {cert.credentialUrl && (
                                        <a
                                            href={cert.credentialUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-2 text-xs text-[#4F46E5] hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Show Credential
                                        </a>
                                    )}
                                </div>
                            </div>
                            {index < certificates.length - 1 && (
                                <div className="mt-5 h-px border-t border-dashed border-[#E2E8F0]" />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={Award}
                    title="Add certifications or complete tasks to earn NexIntern certificates"
                    description="Showcase your achievements and verified skills"
                    ctaLabel="Add Certificate"
                    onCtaClick={onAdd}
                />
            )}
        </SectionCard>
    );
}
