export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page py-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-muted">
        <p>© {new Date().getFullYear()} NyayaFlow. Case filing and tracking for Indian courts.</p>
        <p>AI suggestions are advisory. All decisions rest with the court.</p>
      </div>
    </footer>
  );
}
