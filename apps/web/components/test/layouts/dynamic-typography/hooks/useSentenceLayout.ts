import { useState, useLayoutEffect, useCallback, useEffect } from "react";
import { AtomData } from "@/components/test/layouts/dynamic-typography/primitives/types";
import { Sentence, Word } from "@/hooks/use-audio-stream";
import { FontPairing } from "@/components/test/layouts/dynamic-typography/primitives/font-primitives";
import { useFontLoader } from "@/hooks/use-font-loader";

interface SentenceLayoutOptions {
  sentence: Sentence;
  fontPairing: FontPairing;
  containerWidth: number;
  containerHeight: number;
  atomStyles: string[];
}

const measureText = (
  text: string,
  style: React.CSSProperties
): { width: number; height: number } => {
  if (typeof document === "undefined") {
    return { width: 0, height: 0 };
  }
  const element = document.createElement("div");
  document.body.appendChild(element);

  element.style.position = "absolute";
  element.style.visibility = "hidden";
  element.style.pointerEvents = "none";
  element.style.width = "auto";
  element.style.height = "auto";
  element.style.whiteSpace = "nowrap";
  Object.assign(element.style, style);
  element.textContent = text;

  const dimensions = {
    width: element.scrollWidth,
    height: element.scrollHeight,
  };

  document.body.removeChild(element);
  return dimensions;
};

const getRandomElement = <T>(arr: T[]): T | undefined => {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
};

export const useSentenceLayout = ({
  sentence,
  fontPairing,
  containerWidth,
  containerHeight,
  atomStyles,
}: SentenceLayoutOptions): AtomData[] => {
  const [atoms, setAtoms] = useState<AtomData[]>([]);
  const { loadFonts, areFontsReady } = useFontLoader();

  // 1. Load the required fonts
  useEffect(() => {
    const fontIds = [fontPairing.main.id];
    if (fontPairing.sub) {
      fontIds.push(fontPairing.sub.id);
    }
    loadFonts(fontIds);
  }, [fontPairing, loadFonts]);

  const calculateLayout = useCallback(() => {
    const requiredFontIds = [fontPairing.main.id];
    if (fontPairing.sub) {
      requiredFontIds.push(fontPairing.sub.id);
    }
    if (
      containerWidth <= 1 ||
      containerHeight <= 1 ||
      sentence.words.length === 0 ||
      !areFontsReady(requiredFontIds)
    ) {
      setAtoms([]);
      return;
    }

    // 1. Identify Hero Word
    const heroWord = sentence.words.reduce(
      (longest, current) =>
        current.text.length > longest.text.length ? current : longest,
      sentence.words[0] || { text: "", start: -1, end: -1, duration: 0 }
    );

    // 2. Sequential Line Breaking (preserving order)
    const lines: Word[][] = [];
    let currentLine: Word[] = [];

    sentence.words.forEach((word) => {
      const isHero =
        word.text === heroWord.text && word.start === heroWord.start;
      if (isHero) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        lines.push([word]);
        currentLine = [];
      } else {
        currentLine.push(word);
      }
    });
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // 3. "Fill-Width" Scaling for Every Line
    const newAtoms: AtomData[] = lines
      .filter((line) => line.length > 0)
      .map((lineWords, index) => {
        const text = lineWords.map((w) => w.text).join(" ");
        const isHeroLine =
          lineWords.length === 1 &&
          lineWords[0]?.text === heroWord.text &&
          lineWords[0]?.start === heroWord.start;

        const font =
          isHeroLine || !fontPairing.sub ? fontPairing.main : fontPairing.sub;
        const fontFamily = `${font.id.replace(/_/g, " ")}, ${font.category}`;

        // Binary search for the best font scale to fill the width
        let minScale = 0.1,
          maxScale = 5.0;
        let bestScale = 0;

        for (let i = 0; i < 7; i++) {
          const midScale = (minScale + maxScale) / 2;
          const { width } = measureText(text, {
            fontFamily,
            fontSize: `${100 * midScale}px`,
            textTransform: "uppercase",
          });
          if (width <= containerWidth) {
            bestScale = midScale;
            minScale = midScale;
          } else {
            maxScale = midScale;
          }
        }

        const style = {
          fontFamily,
          fontSize: `${100 * bestScale}px`,
          textTransform: "uppercase" as const,
          lineHeight: "1em",
          color: "white",
          whiteSpace: "nowrap" as const,
        };

        const firstWord = lineWords[0]!;
        const lastWord = lineWords[lineWords.length - 1]!;

        console.log(firstWord, lastWord, sentence);

        return {
          id: `${sentence.id}-line-${index}`,
          text,
          component: getRandomElement(atomStyles) || "default",
          style,
          timing: {
            delay: firstWord.start - sentence.start,
            duration: lastWord.end - firstWord.start,
          },
        };
      });

    setAtoms(newAtoms);
  }, [
    sentence,
    fontPairing,
    containerWidth,
    containerHeight,
    atomStyles,
    areFontsReady,
  ]);

  useLayoutEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  return atoms;
};
