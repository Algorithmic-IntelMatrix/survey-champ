import React, { useState } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { IconSearch, IconFocus2, IconList } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { getNodeDefinition } from '@/components/nodes/definitions';

export default function NodeViewer({ nodes, onSelect }: { nodes: Node[], onSelect: (id: string) => void }) {
    const { setCenter } = useReactFlow();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredNodes = nodes.filter(n =>
        (n.data?.label as string || '').toLowerCase().includes(search.toLowerCase()) ||
        (n.type || '').toLowerCase().includes(search.toLowerCase())
    );

    const focusNode = (node: Node) => {
        setCenter(node.position.x + (node.measured?.width || 200) / 2, node.position.y + (node.measured?.height || 100) / 2, { zoom: 1, duration: 800 });
        onSelect(node.id);
    };

    return (
        <div className="fixed bottom-20 left-4 z-50 flex flex-col items-start gap-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-3 rounded-full shadow-lg transition-all flex items-center gap-2",
                    isOpen ? "bg-primary text-primary-foreground" : "bg-background border border-border text-foreground hover:bg-muted"
                )}
            >
                <IconList size={20} />
                {isOpen && <span className="text-xs font-semibold uppercase tracking-wider">Node Viewer</span>}
            </button>

            {isOpen && (
                <div className="w-72 max-h-[400px] bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="p-3 border-b border-border bg-muted/30">
                        <div className="relative">
                            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search nodes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filteredNodes.length > 0 ? (
                            filteredNodes.map(node => {
                                const def = getNodeDefinition(node.type || '');
                                const Icon = def?.icon || IconFocus2;
                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => focusNode(node)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-all group text-left"
                                    >
                                        <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold truncate leading-none mb-1 capitalize text-muted-foreground/60">
                                                {node.type?.replace(/([A-Z])/g, ' $1')}
                                            </div>
                                            <div className="text-[13px] font-medium truncate text-foreground leading-tight">
                                                {node.data?.label as string || 'Untitled Node'}
                                            </div>
                                        </div>
                                        <IconFocus2 size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground italic">
                                No nodes found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
