"use client";

import { useRef } from "react";
import type { WaitlistProjectConfig } from "@/config/schema";

export function FounderVideo({ video }: { video: WaitlistProjectConfig["founderVideo"] }) {
  const tracked = useRef(false);

  if (!video.enabled) return null;

  async function trackVideoEngagement() {
    if (tracked.current) return;
    tracked.current = true;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "founder_video_played", properties: { title: video.title } }),
    });
  }

  return (
    <section className="founder-video mx-auto mt-20 w-full max-w-4xl px-5">
      <div
        className="founder-video__frame aspect-video overflow-hidden rounded-[calc(var(--radius)*1.6)] border border-border bg-surface shadow-soft backdrop-blur-[var(--backdrop-blur)]"
        onPointerDown={trackVideoEngagement}
      >
        {video.embedUrl ? (
          <iframe
            className="h-full w-full"
            src={video.embedUrl}
            title={video.title ?? "Founder video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="founder-video__placeholder">
            <div className="founder-video__note">
              <span>A quick</span>
              <span>intro from us</span>
            </div>
            <button className="founder-video__play" type="button" aria-label={video.title ?? "Play founder video"} />
          </div>
        )}
      </div>
    </section>
  );
}
