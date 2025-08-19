"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

type Props = {
	onStart: () => void;
	className?: string;
	autoFocus?: boolean;
};

export default function NextTestButton({ onStart, className = "", autoFocus }: Props) {
	return (
		<motion.button
			type="button"
			autoFocus={autoFocus}
			onClick={onStart}
			aria-label="Start a new test"
			className={[
				"group relative inline-flex items-center gap-2 rounded-2xl px-5 py-3",
				"font-semibold tracking-wide",
				"bg-gradient-to-r from-orange-600 via-red-600 to-amber-500",
				"text-white shadow-[0_0_30px_rgba(255,80,0,.25)]",
				"transition-transform duration-150 active:scale-95",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60",
				"overflow-hidden",
				className,
			].join(" ")}
		>
			<Flame className="h-5 w-5 animate-pulse" />
			<span className="drop-shadow-md">New Test</span>

			<span className="pointer-events-none absolute inset-0 animate-flameGlow opacity-30" />
			<span className="pointer-events-none absolute -inset-6 animate-sparks opacity-0 group-hover:opacity-70" />
		</motion.button>
	);
}


