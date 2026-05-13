import { permanentRedirect } from "next/navigation";

// `/preise` wurde als eigenständige Marketing-Seite eingestampft –
// die vollständige Preistabelle lebt auf der Landingpage unter `#pricing`.
// Statt einer thin-content Seite (SEO-/UX-Vibe-Killer) leiten wir per
// 308-Permanent-Redirect dorthin um. Externe Backlinks behalten ihren Wert.
export default function PreisePage() {
  permanentRedirect("/#pricing");
}
