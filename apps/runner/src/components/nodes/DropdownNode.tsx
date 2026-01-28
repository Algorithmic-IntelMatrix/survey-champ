"use client"
import { useState, useMemo, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { IconChevronDown, IconSearch, IconCheck, IconArrowRight } from "@tabler/icons-react"
import { motion, AnimatePresence } from "framer-motion"
import { NodeProps } from "./types"

export const DropdownNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedValue, setSelectedValue] = useState<string | null>(null);

    const options = msg.options || [];
    const placeholder = nodeData.placeholder || "Select an option...";
    const isSearchable = nodeData.searchable !== false; // Default to true

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter((opt: any) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const handleSelect = (value: string) => {
        setSelectedValue(value);
        setIsOpen(false);
        // Small delay to show selection update before moving on?
        // Or requiring a confirm button?
        // Let's require a confirm button for dropdowns to avoid mis-clicks since it's a menu.
        // Wait, chat interface usually prefers speed.
        // But for a dropdown, you might want to change your mind before locking it in.
        // I will add a "Continue" button that appears once selected.
    };

    // Close on click outside
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (msg.type !== 'dropdown') return null;

    const selectedOption = options.find((o: any) => o.value === selectedValue);

    return (
        <div className="w-full max-w-md space-y-4" ref={containerRef}>
            <div className="relative">
                <button
                    disabled={!isActive}
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between px-5 py-4 bg-card border shadow-sm rounded-xl transition-all text-base font-medium text-left hover:shadow-md hover:border-primary/50",
                        isOpen ? "ring-2 ring-primary border-transparent" : "border-border",
                        !isActive && "opacity-60 cursor-default shadow-none bg-muted hover:border-border hover:shadow-none"
                    )}
                >
                    <span className={cn("truncate", !selectedValue && "text-muted-foreground")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <IconChevronDown
                        size={20}
                        className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
                    />
                </button>

                <AnimatePresence>
                    {isOpen && isActive && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80"
                        >
                            {isSearchable && (
                                <div className="p-3 border-b border-border bg-muted/30">
                                    <div className="relative">
                                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search..."
                                            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto p-1 custom-scrollbar flex-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt: any) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSelect(opt.value)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm text-left transition-colors hover:bg-muted",
                                                selectedValue === opt.value && "bg-primary/5 text-primary font-medium"
                                            )}
                                        >
                                            {opt.label}
                                            {selectedValue === opt.value && <IconCheck size={16} />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground italic">
                                        No results found
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {isActive && selectedValue && !isOpen && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => handleNext(selectedValue)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full text-base font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        Confirm Selection <IconArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};
