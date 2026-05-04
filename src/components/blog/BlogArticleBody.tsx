import { BLOG_YOUTUBE_MARKER } from "@/lib/blog/blog-html";
import { YouTubeEmbed } from "@/components/blog/YouTubeEmbed";

type Props = {
  html: string;
  youtubeId: string | null;
  videoCaption: string;
};

/**
 * Rendert HTML aus der DB; optional `{{YOUTUBE}}`-Marker für die Einbettung.
 * Ohne Marker, aber mit `youtubeId`: Video am Ende des Artikels.
 */
export function BlogArticleBody({ html, youtubeId, videoCaption }: Props) {
  const vid = youtubeId?.trim() || null;

  if (html.includes(BLOG_YOUTUBE_MARKER)) {
    const parts = html.split(BLOG_YOUTUBE_MARKER);
    return (
      <>
        {parts[0]?.trim() ? <div dangerouslySetInnerHTML={{ __html: parts[0] }} /> : null}
        <YouTubeEmbed videoId={vid} title={videoCaption} />
        {parts[1]?.trim() ? <div dangerouslySetInnerHTML={{ __html: parts[1] }} /> : null}
      </>
    );
  }

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {vid ? <YouTubeEmbed videoId={vid} title={videoCaption} /> : null}
    </>
  );
}
