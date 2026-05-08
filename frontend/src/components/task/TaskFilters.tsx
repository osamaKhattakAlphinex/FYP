"use client";

import { useState, useEffect } from "react";
import { TaskFilters as TaskFiltersType, taskService } from "@/services/taskService";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface TaskFiltersProps {
    filters: TaskFiltersType;
    onFilterChange: (filters: TaskFiltersType) => void;
}

interface FilterSection {
    title: string;
    key: keyof TaskFiltersType;
    options: Array<{ value: string; label: string; count?: number }>;
    isOpen: boolean;
}

export default function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
    const [sections, setSections] = useState<FilterSection[]>([
        {
            title: "Category",
            key: "category",
            isOpen: true,
            options: [
                { value: "all", label: "All Categories" },
                { value: "Web Development", label: "Web Development" },
                { value: "Mobile Development", label: "Mobile Development" },
                { value: "UI/UX Design", label: "UI/UX Design" },
                { value: "Data Science", label: "Data Science" },
                { value: "Machine Learning", label: "Machine Learning" },
                { value: "Digital Marketing", label: "Digital Marketing" },
                { value: "Content Writing", label: "Content Writing" },
                { value: "Graphic Design", label: "Graphic Design" },
                { value: "Video Editing", label: "Video Editing" },
                { value: "Business Analysis", label: "Business Analysis" },
                { value: "Quality Assurance", label: "Quality Assurance" },
                { value: "DevOps", label: "DevOps" },
                { value: "Cybersecurity", label: "Cybersecurity" },
                { value: "Other", label: "Other" }
            ]
        },
        {
            title: "Work Type",
            key: "workType",
            isOpen: true,
            options: [
                { value: "all", label: "All Types" },
                { value: "remote", label: "🏠 Remote" },
                { value: "onsite", label: "🏢 On-site" },
                { value: "hybrid", label: "🔄 Hybrid" }
            ]
        },
        {
            title: "Experience Level",
            key: "experienceLevel",
            isOpen: true,
            options: [
                { value: "all", label: "All Levels" },
                { value: "entry", label: "Entry Level" },
                { value: "intermediate", label: "Intermediate" },
                { value: "expert", label: "Expert" }
            ]
        },
        {
            title: "Budget Range",
            key: "budget",
            isOpen: true,
            options: [
                { value: "all", label: "All Budgets" },
                { value: "unpaid", label: "Unpaid" },
                { value: "under-500", label: "Under $500" },
                { value: "500-1000", label: "$500 - $1,000" },
                { value: "over-1000", label: "Over $1,000" }
            ]
        },
        {
            title: "Location",
            key: "location",
            isOpen: false,
            options: [
                { value: "all", label: "All Locations" },
                { value: "remote", label: "Remote Only" },
                { value: "United States", label: "United States" },
                { value: "Canada", label: "Canada" },
                { value: "United Kingdom", label: "United Kingdom" },
                { value: "Germany", label: "Germany" },
                { value: "Australia", label: "Australia" },
                { value: "India", label: "India" },
                { value: "Pakistan", label: "Pakistan" }
            ]
        }
    ]);

    const [popularSkills] = useState([
        "JavaScript", "React", "Python", "Node.js", "TypeScript",
        "Java", "PHP", "CSS", "HTML", "SQL", "MongoDB", "AWS",
        "Docker", "Git", "Figma", "Photoshop", "WordPress"
    ]);

    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    useEffect(() => {
        // Initialize selected skills from filters
        if (filters.skills) {
            setSelectedSkills(filters.skills.split(','));
        }
    }, []);

    const handleFilterChange = (key: keyof TaskFiltersType, value: string) => {
        const newFilters = { ...filters };

        if (value === "all" || value === "") {
            delete newFilters[key];
        } else {
            newFilters[key] = value;
        }

        onFilterChange(newFilters);
    };

    const toggleSection = (index: number) => {
        setSections(prev => prev.map((section, i) =>
            i === index ? { ...section, isOpen: !section.isOpen } : section
        ));
    };

    const handleSkillToggle = (skill: string) => {
        const newSkills = selectedSkills.includes(skill)
            ? selectedSkills.filter(s => s !== skill)
            : [...selectedSkills, skill];

        setSelectedSkills(newSkills);

        const skillsString = newSkills.length > 0 ? newSkills.join(',') : undefined;
        onFilterChange({ ...filters, skills: skillsString });
    };

    const clearSkills = () => {
        setSelectedSkills([]);
        const newFilters = { ...filters };
        delete newFilters.skills;
        onFilterChange(newFilters);
    };

    return (
        <div className="space-y-6">
            {/* Filter Sections */}
            {sections.map((section, index) => (
                <div key={section.key} className="border-b border-gray-200 pb-4">
                    <button
                        onClick={() => toggleSection(index)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <h3 className="text-sm font-medium text-gray-900">{section.title}</h3>
                        {section.isOpen ? (
                            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {section.isOpen && (
                        <div className="mt-3 space-y-2">
                            {section.options.map((option) => (
                                <label key={option.value} className="flex items-center">
                                    <input
                                        type="radio"
                                        name={section.key}
                                        value={option.value}
                                        checked={
                                            option.value === "all"
                                                ? !filters[section.key] || filters[section.key] === "all"
                                                : filters[section.key] === option.value
                                        }
                                        onChange={(e) => handleFilterChange(section.key, e.target.value)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 flex-1">
                                        {option.label}
                                    </span>
                                    {option.count && (
                                        <span className="text-xs text-gray-500">({option.count})</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Skills Filter */}
            <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Skills</h3>
                    {selectedSkills.length > 0 && (
                        <button
                            onClick={clearSkills}
                            className="text-xs text-blue-600 hover:text-blue-700"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {/* Selected Skills */}
                    {selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {selectedSkills.map((skill) => (
                                <span
                                    key={skill}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {skill}
                                    <button
                                        onClick={() => handleSkillToggle(skill)}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Popular Skills */}
                    <div className="flex flex-wrap gap-1">
                        {popularSkills
                            .filter(skill => !selectedSkills.includes(skill))
                            .slice(0, 12)
                            .map((skill) => (
                                <button
                                    key={skill}
                                    onClick={() => handleSkillToggle(skill)}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    + {skill}
                                </button>
                            ))}
                    </div>
                </div>
            </div>

            {/* Active Filters Summary */}
            {Object.keys(filters).some(key =>
                filters[key as keyof TaskFiltersType] &&
                key !== 'sortBy' &&
                key !== 'sortOrder' &&
                filters[key as keyof TaskFiltersType] !== 'all'
            ) && (
                    <div className="pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Active Filters</h4>
                        <div className="space-y-1">
                            {Object.entries(filters).map(([key, value]) => {
                                if (!value || key === 'sortBy' || key === 'sortOrder' || value === 'all') return null;

                                const section = sections.find(s => s.key === key);
                                const option = section?.options.find(o => o.value === value);

                                return (
                                    <div key={key} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">
                                            {section?.title}: {option?.label || value}
                                        </span>
                                        <button
                                            onClick={() => handleFilterChange(key as keyof TaskFiltersType, "all")}
                                            className="text-red-600 hover:text-red-700 ml-2"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
        </div>
    );
}