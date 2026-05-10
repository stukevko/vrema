/**
 * Inline-Script, das VOR dem Body ausgeführt wird.
 * Liest gespeicherte Theme-Wahl (oder OS-Preference) und setzt
 * .dark / .light auf <html>, bevor irgendeine Pixelfarbe gerendert wird.
 *
 * → Kein FOUC, kein Theme-Flash beim ersten Paint.
 */
export function ThemeScript(): React.JSX.Element {
  const code = `
(function () {
  try {
    var stored = localStorage.getItem('vrema-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {
    /* localStorage gesperrt o. ä. — Default Light. */
  }
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
