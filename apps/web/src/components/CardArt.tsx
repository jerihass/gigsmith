import { useState } from "react";
import type { Card } from "@gigsmith/data-contracts";

type CardArtVariant = "thumbnail" | "detail";
type MediaStatus = "loading" | "loaded" | "unavailable";

export function CardArt({
  card,
  enabled,
  source,
  sourcePending = false,
  variant
}: {
  card: Card;
  enabled: boolean;
  source?: string;
  sourcePending?: boolean;
  variant: CardArtVariant;
}) {
  const [media, setMedia] = useState<{ source: string; status: MediaStatus }>({
    source: "",
    status: "loading"
  });

  if (!enabled) return null;
  if (!source) {
    return (
      <div
        className={`card-art ${variant} unavailable`}
        role="img"
        aria-label={`${sourcePending ? "Loading artwork" : "Artwork unavailable"} for ${card.display_name}`}
      >
        <span>{sourcePending ? "Loading art source" : "Art unavailable"}</span>
      </div>
    );
  }

  const status = media.source === source ? media.status : "loading";
  return (
    <div className={`card-art ${variant} ${status}`}>
      {status === "loading" && <span className="card-art-status">Loading art</span>}
      {status === "unavailable" && <span className="card-art-status">Art unavailable</span>}
      {status !== "unavailable" && (
        <img
          src={source}
          alt={`${card.display_name} card art`}
          width="500"
          height="700"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setMedia({ source, status: "loaded" })}
          onError={() => setMedia({ source, status: "unavailable" })}
        />
      )}
    </div>
  );
}
