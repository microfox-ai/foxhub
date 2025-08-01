import { splittedStory } from "./splitted-story";
import { story } from "./story";

describe("splittedStory", () => {
  it("should have a sentences property which is an array of strings", () => {
    console.log(splittedStory);
    expect(Array.isArray(splittedStory.sentences)).toBe(true);
    splittedStory.sentences.forEach((sentence) => {
      expect(typeof sentence).toBe("string");
    });
  });

  it("should not have any sentences with more than 15 words", () => {
    splittedStory.sentences.forEach((sentence) => {
      const wordCount = sentence.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(15);
    });
  });

  it("should reconstruct the original story text when sentences are joined", () => {
    // This is a simplified check. A perfect reconstruction is hard because of splitting logic.
    // We will check if all words from the original text are present in the sentences.
    const originalWords = story.text.trim().split(/\s+/);
    const splitWords = splittedStory.sentences.join(" ").split(/\s+/);

    // This is a simple check, a more robust one would be to normalize and compare
    // but for this case, it should be sufficient.
    expect(splitWords.join(" ")).toContain(originalWords.join(" "));
  });
});
