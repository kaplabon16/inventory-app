export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="px-4 py-6 mt-auto border-t border-gray-200 bg-white/90 text-sm text-slate-600 dark:border-[#1b1b1b] dark:bg-black/90 dark:text-slate-400">
      <div className="flex flex-col items-start max-w-6xl gap-2 mx-auto sm:flex-row sm:items-center sm:justify-between">
        <span>Inventory Management System © {year}</span>
        <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Created by Kaushik Plabon. In the pursuit of success.</span>
      </div>
    </footer>
  )
}
