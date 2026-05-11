import React, { useState, useEffect } from "react";
import api from "../lib/api";

/** Loads an authenticated image from /api/images/:id as a blob URL. */
export default function AuthImage({ imageId, alt = "", className = "", onClick }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let mounted = true;
    let url = null;
    if (!imageId) return undefined;
    (async () => {
      try {
        const res = await api.get(`/images/${imageId}`, { responseType: "blob" });
        url = URL.createObjectURL(res.data);
        if (mounted) setSrc(url);
      } catch {
        if (mounted) setSrc(null);
      }
    })();
    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  if (!src)
    return (
      <div
        className={`bg-stone-100 animate-pulse ${className}`}
        aria-label={alt}
      />
    );
  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      className={`${className} ${onClick ? "cursor-zoom-in" : ""}`}
    />
  );
}
