import {
  ArrowLeft, ArrowUpRight, Check, ChevronDown, File, FileText, House,
  Link2, Maximize2, MoreHorizontal, Pencil, Play, Plus,
  Save, Search, Settings, Sprout, Trash2, Unlink, X,
} from "lucide-react";

const icons = {
  back: ArrowLeft, open: ArrowUpRight, check: Check, chevron: ChevronDown,
  file: File, document: FileText, home: House, link: Link2, connect: Link2,
  fit: Maximize2, more: MoreHorizontal,
  edit: Pencil, video: Play, plus: Plus, save: Save, search: Search,
  settings: Settings, garden: Sprout, trash: Trash2,
  unlink: Unlink, close: X,
} as const;

export interface IconProps {
  readonly name: keyof typeof icons;
  readonly size?: number;
  readonly className?: string;
}

export function Icon({ name, size = 18, className = "" }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" className={`ui-icon ${className}`.trim()} />;
}
