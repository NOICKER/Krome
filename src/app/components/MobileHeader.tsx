import { GlobalProfileButton } from "./ui/GlobalProfileButton";

interface MobileHeaderProps {
    title: string;
    potValue?: number;
}

export function MobileHeader({ title, potValue }: MobileHeaderProps) {
    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#080C18]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4">
            {/* Left: Small Logo */}
            <div className="flex items-center w-1/4">
                <img src="/k-icon.png" alt="Krome" className="h-5 w-auto object-contain" />
            </div>

            {/* Center: Title */}
            <div className="flex-1 flex justify-center items-center">
                <span className="text-sm font-bold text-slate-100 tracking-tight truncate px-2">{title}</span>
            </div>

            {/* Right: Pot & Auth Avatar */}
            <div className="flex items-center justify-end w-1/4 gap-2">
                <GlobalProfileButton variant="mobile" />
            </div>
        </div>
    );
}
