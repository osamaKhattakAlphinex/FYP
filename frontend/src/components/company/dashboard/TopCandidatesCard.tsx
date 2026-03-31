"use client";

import { Star, MapPin, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface Candidate {
    id: string;
    name: string;
    avatar: string;
    title: string;
    location: string;
    experience: string;
    skills: string[];
    matchScore: number;
}

interface TopCandidatesCardProps {
    candidates: Candidate[];
}

export default function TopCandidatesCard({ candidates }: TopCandidatesCardProps) {
    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#F59E0B] fill-current" />
                    <h3 className="text-lg font-bold text-[#0F172A]">Top Candidates</h3>
                </div>
                <Link href="/company/candidates" className="text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]">
                    View All
                </Link>
            </div>
            <div className="space-y-4">
                {candidates.map((candidate) => (
                    <Link
                        key={candidate.id}
                        href={`/profile/${candidate.id}`}
                        className="block border border-[#E2E8F0] rounded-xl p-4 hover:border-[#4F46E5] hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                {candidate.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-bold text-[#0F172A]">
                                        {candidate.name}
                                    </p>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-[#FEF3C7] text-[#D97706] rounded-lg">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="text-xs font-bold">{candidate.matchScore}%</span>
                                    </div>
                                </div>
                                <p className="text-xs text-[#64748B] mb-2">{candidate.title}</p>
                                <div className="flex items-center gap-3 text-xs text-[#64748B] mb-2">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {candidate.location}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        {candidate.experience}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {candidate.skills.slice(0, 3).map((skill, index) => (
                                        <span key={index} className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-xs font-medium rounded-md">
                                            {skill}
                                        </span>
                                    ))}
                                    {candidate.skills.length > 3 && (
                                        <span className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] text-xs font-medium rounded-md">
                                            +{candidate.skills.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
