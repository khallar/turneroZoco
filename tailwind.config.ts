import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Background gradients
    "bg-gradient-to-br",
    "bg-gradient-to-r",
    "bg-gradient-to-l",
    "bg-gradient-to-t",
    "bg-gradient-to-b",
    // Red gradients
    "from-red-50",
    "from-red-100",
    "from-red-200",
    "from-red-500",
    "from-red-600",
    "from-red-700",
    "to-red-100",
    "to-red-200",
    "to-red-500",
    "to-red-600",
    "to-red-700",
    "to-red-800",
    "via-red-200",
    // Orange gradients
    "to-orange-100",
    "to-orange-200",
    "from-orange-200",
    "from-orange-400",
    "from-orange-500",
    "to-orange-400",
    "to-orange-500",
    "via-orange-200",
    "via-orange-400",
    "via-orange-500",
    // Yellow gradients
    "from-yellow-200",
    "from-yellow-400",
    "from-yellow-500",
    "to-yellow-400",
    "via-yellow-200",
    "via-yellow-400",
    // Blue gradients
    "from-blue-500",
    "from-blue-600",
    "from-blue-800",
    "from-blue-900",
    "to-blue-600",
    "to-blue-800",
    "to-blue-900",
    "via-blue-800",
    "via-blue-900",
    // Purple gradients
    "from-purple-500",
    "from-purple-600",
    "from-purple-700",
    "to-purple-600",
    "to-purple-700",
    "to-purple-800",
    // Green gradients
    "from-green-500",
    "to-emerald-600",
    // Indigo gradients
    "to-indigo-900",
    "via-indigo-900",
    // Slate gradients
    "from-slate-900",
    "via-slate-900",
    // Gray gradients
    "from-gray-600",
    "to-gray-700",
    // Animations
    "animate-scaleIn",
    "animate-fadeIn",
    "animate-spin",
    "animate-bounce",
    "animate-pulse",
    // Backdrop effects
    "backdrop-blur-sm",
    "backdrop-blur-md",
    // Opacity classes
    "opacity-8",
    "opacity-10",
    "opacity-20",
    "opacity-30",
    "opacity-40",
    // Background opacity
    "bg-white/10",
    "bg-white/20",
    "bg-white/30",
    "bg-white/70",
    "bg-white/80",
    "bg-black/60",
    // Border classes
    "border-2",
    "border-4",
    "border-white/30",
    "border-white/50",
    "border-red-200",
    "border-red-400",
    "border-yellow-400",
    "border-blue-400",
    "border-gray-200",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        scaleIn: {
          from: {
            opacity: "0",
            transform: "scale(0.9)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        fadeIn: {
          from: {
            opacity: "0",
          },
          to: {
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        fadeIn: "fadeIn 0.5s ease-in",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
