export default function Footer() {
  const year = new Date().getFullYear()
  const socials = [
    {
      href: "https://www.linkedin.com/in/kaushik-plabon-91599b208/",
      label: "LinkedIn",
      mark: "in",
    },
    {
      href: "https://www.facebook.com/sinlesssatan",
      label: "Facebook",
      mark: "f",
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
              className="btn btn-ghost h-10 w-10 rounded-full p-0 text-indigo-600 hover:text-white hover:bg-indigo-500 dark:text-indigo-200 dark:hover:text-black"
              aria-label={social.label}
            >
              <span aria-hidden="true" className="text-lg font-bold">{social.mark}</span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
