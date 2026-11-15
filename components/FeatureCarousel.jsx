"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const chips = {
  advisor: "AI-labelled guidance",
  decks: "Flashcards from notes",
  scholarship: "AI-assisted matches",
  university: "Schools and courses",
  exams: "JAMB and WAEC",
  progress: "Streaks and achievements",
};

export function FeatureCarousel({ features }) {
  const trackRef = useRef(null);
  const [position, setPosition] = useState({ start: 0, visible: 3, atStart: true, atEnd: false });

  const updatePosition = useCallback(() => {
    const track = trackRef.current;
    const firstCard = track?.querySelector(".feature-carousel-card");
    if (!track || !firstCard) return;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    const visible = Math.max(1, Math.round((track.clientWidth + gap) / step));
    const maxStart = Math.max(0, features.length - visible);
    const start = Math.min(maxStart, Math.max(0, Math.round(track.scrollLeft / step)));
    const next = { start, visible, atStart: track.scrollLeft <= 2, atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 };
    setPosition((current) => current.start === next.start && current.visible === next.visible && current.atStart === next.atStart && current.atEnd === next.atEnd ? current : next);
  }, [features.length]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  const move = (direction) => {
    const track = trackRef.current;
    const card = track?.querySelector(".feature-carousel-card");
    if (!track || !card) return;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior });
  };

  const lastVisible = Math.min(features.length, position.start + position.visible);

  return <div className="feature-carousel" role="region" aria-roledescription="carousel" aria-label="College ReadyAI study features">
    <div className="feature-carousel-heading">
      <p aria-live="polite" className="feature-carousel-count">Features {position.start + 1}–{lastVisible} of {features.length}</p>
      <div className="feature-carousel-controls">
        <button className="carousel-control" type="button" aria-label="Previous features" onClick={() => move(-1)} disabled={position.atStart}><span aria-hidden="true">←</span></button>
        <button className="carousel-control" type="button" aria-label="Next features" onClick={() => move(1)} disabled={position.atEnd}><span aria-hidden="true">→</span></button>
      </div>
    </div>
    <div className="feature-carousel-track" ref={trackRef} onScroll={updatePosition}>
      {features.map((feature, index) => <article className={`feature-carousel-card feature-slide-${feature.type}`} key={feature.type} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${features.length}`}>
        <div className="feature-slide-copy"><h3>{feature.title}</h3><p>{feature.text}</p></div>
        <div className={`feature-art feature-art-${feature.type}`} aria-hidden="true"><i className="art-shape art-shape-one"/><i className="art-shape art-shape-two"/><i className="art-shape art-shape-three"/></div>
        <div className="feature-slide-bottom"><span className="feature-chip">{chips[feature.type]}</span><button className="feature-slide-next" type="button" aria-label={`Next feature after ${feature.title}`} disabled={position.atEnd} onClick={() => move(1)}><span aria-hidden="true">→</span></button></div>
      </article>)}
    </div>
    <p className="feature-carousel-hint">Swipe or use the arrows to explore the tools.</p>
  </div>;
}
