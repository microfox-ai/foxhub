import { story } from "./story";

const splitTextIntoSentences = (text: string, maxWords: number): string[] => {
  const sentences: string[] = [];
  const paragraphs = text.trim().split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const potentialSentences = paragraph
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s/);

    for (let sentence of potentialSentences) {
      sentence = sentence.trim();
      if (sentence.length === 0) continue;

      const words = sentence.split(/\s+/);
      if (words.length > maxWords) {
        let currentChunkWords: string[] = [];
        for (const word of words) {
          currentChunkWords.push(word);
          if (currentChunkWords.length === maxWords) {
            sentences.push(currentChunkWords.join(" "));
            currentChunkWords = [];
          }
        }
        if (currentChunkWords.length > 0) {
          sentences.push(currentChunkWords.join(" "));
        }
      } else {
        sentences.push(sentence);
      }
    }
  }

  return sentences;
};

const maxWords = 6;

export const splittedStory = {
  sentences: splitTextIntoSentences(
    story?.splitStory?.join(" ") ?? "",
    maxWords
  ),
};

console.log(splittedStory);
