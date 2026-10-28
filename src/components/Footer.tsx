export default function Footer() {
  return (
    <footer className="px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
      <p>&copy; 2026 Minimalist Auth App. Todos los derechos reservados.</p>
      <div className="mt-2 flex justify-center gap-4">
        <a href="#" className="hover:underline">Contacto</a>
        <a href="#" className="hover:underline">Twitter</a>
        <a href="#" className="hover:underline">GitHub</a>
      </div>
    </footer>
  );
}
