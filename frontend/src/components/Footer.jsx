import { useMemo } from "react"

const socials = [
  {
    href: "https://www.linkedin.com/in/kaushik-plabon-91599b208/",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.94 21V8.56" />
        <path d="M6.94 4.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" fill="currentColor" stroke="none" />
        <path d="M10.96 21v-7.07c0-1.74 1.41-3.15 3.15-3.15a3.15 3.15 0 0 1 3.15 3.15V21" />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/sinlesssatan",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 7H17V4h-2.5C11.46 4 9 6.46 9 9.5V11H6v3h3v7h3v-7h3l.5-3H12v-1.5A1.5 1.5 0 0 1 13.5 7h1Z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const year = useMemo(() => new Date().getFullYear(), [])

  return (
    <footer className="px-4 py-6 mt-auto border-t border-gray-200 bg-white/90 text-sm text-slate-600 dark:border-[#1b1b1b] dark:bg-black/90 dark:text-slate-400">
      <div className="flex flex-col items-start max-w-6xl gap-3 mx-auto sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200">Inventory Management System</span>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-500">© {year} • Created by Kaushik Plabon</div>
        </div>
        <div className="flex items-center gap-2">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="icon-btn text-indigo-600 hover:text-white hover:bg-indigo-500 dark:text-indigo-200 dark:hover:text-black"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
