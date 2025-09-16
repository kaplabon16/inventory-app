export default function Footer() {
  const year = new Date().getFullYear()
  const socials = [
    {
      href: "https://www.linkedin.com/in/kaushik-plabon-91599b208/",
      label: "LinkedIn",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path fill="currentColor" d="M4.98 3.5A2 2 0 1 1 5 7.5a2 2 0 0 1-.02-4Zm.02 4.75h-2.5V21h2.5ZM9 8.25h2.4v1.73h.03c.33-.63 1.13-1.29 2.33-1.29c2.48 0 2.94 1.63 2.94 3.75V21h-2.5v-7.2c0-1.71-.03-3.9-2.38-3.9c-2.38 0-2.75 1.86-2.75 3.78V21H9Z" />
        </svg>
      ),
    },
    {
      href: "https://www.facebook.com/sinlesssatan",
      label: "Facebook",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path fill="currentColor" d="M14 13.5h2.5l.4-3H14v-1.9c0-.87.28-1.65 1.5-1.65h1.4V4.2c-.24-.03-1.06-.1-2.02-.1c-2.1 0-3.53 1.28-3.53 3.63V10.5h-2.4v3H11v7.5h3v-7.5Z" />
        </svg>
      ),
    },
  ]

  return (
    <footer className="px-4 py-6 mt-auto border-t border-gray-200 bg-white/90 text-sm text-slate-600 dark:border-[#1b1b1b] dark:bg-black/90 dark:text-slate-400">
      <div className="max-w-6xl mx-auto flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <span className="block font-medium text-slate-700 dark:text-slate-200">Inventory Management System © {year}</span>
          <span className="block text-xs sm:text-sm text-slate-500 dark:text-slate-500">Created by Kaushik Plabon. Streamlining assets and support workflows.</span>
        </div>
        <div className="flex items-center gap-2">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost h-10 w-10 rounded-full p-0 text-indigo-600 hover:text-indigo-500 dark:text-indigo-200 dark:hover:text-indigo-100"
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
