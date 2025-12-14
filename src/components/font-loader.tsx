"use client";

import { useEffect, useState } from "react";

export function FontLoader() {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    // Check if the font link already exists
    const existingLink = document.querySelector(
      'link[href*="Material+Symbols+Outlined"]'
    );
    
    if (!existingLink) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
      link.rel = "stylesheet";
      
      link.onload = () => {
        // Wait for font to be ready
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setFontLoaded(true);
          });
        } else {
          setFontLoaded(true);
        }
      };
      
      document.head.appendChild(link);
    } else {
      setFontLoaded(true);
    }
  }, []);

  // Force re-render when font is loaded
  if (!fontLoaded) {
    return null;
  }

  return null;
}

