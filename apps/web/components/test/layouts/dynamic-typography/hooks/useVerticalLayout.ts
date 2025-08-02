import { useState, useLayoutEffect, useCallback } from "react";
import { AtomData } from "../primitives/types";
import { Sentence, Word } from "@/hooks/use-audio-stream";
import { FontPairing, getFontFamily } from "../primitives/font-primitives";
import { useFontLoader } from "@/hooks/use-font-loader";

interface UseVerticalLayoutParams {
  sentence: Sentence;
  fontPairing: FontPairing;
  containerWidth: number;
  containerHeight: number;
  atomStyles?: string[];
}

const measureText = (
  text: string,
  style: React.CSSProperties
): { width: number; height: number } => {
  if (typeof document === "undefined") return { width: 0, height: 0 };
  const element = document.createElement("div");
  document.body.appendChild(element);
  Object.assign(element.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    width: "auto",
    height: "auto",
    whiteSpace: "nowrap",
    ...style,
  });
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

export const useVerticalLayout = ({
  sentence,
  fontPairing,
  containerWidth,
  containerHeight,
  atomStyles = ["default"],
}: UseVerticalLayoutParams) => {
  const [layout, setLayout] = useState<{
    lines: AtomData[][];
    contentHeight: number;
  }>({ lines: [], contentHeight: 0 });
  const { loadFonts, areFontsReady } = useFontLoader();

  useLayoutEffect(() => {
    const fontIds = [fontPairing.main.id];
    if (fontPairing.sub) fontIds.push(fontPairing.sub.id);
    loadFonts(fontIds);
  }, [fontPairing, loadFonts]);

  const calculateLayout = useCallback(() => {
    const requiredFontIds = [fontPairing.main.id];
    if (fontPairing.sub) requiredFontIds.push(fontPairing.sub.id);

    if (
      containerWidth <= 1 ||
      containerHeight <= 1 ||
      sentence.words.length === 0 ||
      !areFontsReady(requiredFontIds)
    ) {
      setLayout({ lines: [], contentHeight: 0 });
      return;
    }

    const heroWord = sentence.words.reduce(
      (l, c) => (c.text.length > l.text.length ? c : l),
      sentence.words[0]!
    );

    if (!heroWord) {
      setLayout({ lines: [], contentHeight: 0 });
      return;
    }

    const mainFontFamily = getFontFamily(fontPairing.main);
    const subFontFamily = fontPairing.sub
      ? getFontFamily(fontPairing.sub)
      : mainFontFamily;

    // 1. Break words into lines
    const linesOfWords: Word[][] = [];
    let currentLine: Word[] = [];
    const subFontTempStyle = { fontFamily: subFontFamily, fontSize: "10px" }; // for rough measurement

    for (const word of sentence.words) {
      const isHero =
        word.start === heroWord.start && word.text === heroWord.text;
      if (isHero) {
        if (currentLine.length > 0) linesOfWords.push(currentLine);
        linesOfWords.push([word]);
        currentLine = [];
        continue;
      }

      const testLineText = [...currentLine, word].map((w) => w.text).join(" ");
      const { width } = measureText(testLineText, subFontTempStyle);
      const relativeWidth = (width / 10) * 24; // estimate final size

      if (relativeWidth > containerWidth && currentLine.length > 0) {
        linesOfWords.push(currentLine);
        currentLine = [word];
      } else {
        currentLine.push(word);
      }
    }
    if (currentLine.length > 0) linesOfWords.push(currentLine);

    // 2. Calculate styles for each line and generate AtomData
    const atomsByLine: AtomData[][] = [];
    let totalHeight = 0;

    linesOfWords.forEach((lineWords, lineIndex) => {
      const lineText = lineWords.map((w) => w.text).join(" ");
      const isHeroLine =
        lineWords.length === 1 && lineWords[0]?.start === heroWord.start;
      const fontFamily = isHeroLine ? mainFontFamily : subFontFamily;

      let bestFontSize = 0;
      let minFont = 1,
        maxFont = 300;
      for (let i = 0; i < 8; i++) {
        // 8 iterations for binary search
        const midFont = (minFont + maxFont) / 2;
        const { width } = measureText(lineText, {
          fontFamily,
          fontSize: `${midFont}px`,
        });
        if (width <= containerWidth) {
          bestFontSize = midFont;
          minFont = midFont;
        } else {
          maxFont = midFont;
        }
      }

      const finalStyle = {
        fontFamily,
        fontSize: `${bestFontSize}px`,
        textTransform: "uppercase" as const,
        lineHeight: lineWords.length == 1 ? "1em" : "1.25em",
        color: "white",
      };
      const { height: lineHeight } = measureText(lineText, finalStyle);
      totalHeight += lineHeight;

      const atomLine = lineWords.map((word, wordIndex) => ({
        id: `${sentence.id}-${lineIndex}-${wordIndex}`,
        text: word.text.trim(),
        component: getRandomElement(atomStyles) || "default",
        as: "span" as const,
        style: { ...finalStyle }, // Add margin for spacing between words
        timing: {
          delay: word.start - sentence.start - 0.1,
          duration:
            lineWords.length == 1
              ? word.duration
              : word.duration > 0.4
                ? word.duration
                : 0.1,
        },
      }));
      atomsByLine.push(atomLine);
    });

    setLayout({ lines: atomsByLine, contentHeight: totalHeight });
  }, [
    sentence,
    fontPairing,
    containerWidth,
    containerHeight,
    areFontsReady,
    atomStyles,
  ]);

  useLayoutEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  return layout;
};
