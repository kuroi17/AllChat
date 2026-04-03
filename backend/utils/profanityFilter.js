const PROFANITY_TERMS = [
  // English
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "shitty",
  "bitch",
  "bastard",
  "asshole",
  "motherfucker",
  "bullshit",
  "nigga",
  "nigger",
  "fuck you",
  "fuck u",
  "dick",
  "pussy",
  "vagina",
  "cum",
  // Filipino / Tagalog slang and curse words
  "puta",
  "putangina",
  "putangina mo",
  "tangina",
  "gago",
  "ulol",
  "tarantado",
  "bwisit",
  "leche",
  "punyeta",
  "kupal",
  "hinayupak",
  "pakyu",
  "tanga",
  "bisaya",
  "tanginamo",
  "bembang",
  "kantot",
  "bembangan",
  "bembangin",
  "kantutin",
  "kantutan",
  "pepe",
  "puke",
  "titi",
  "tite",
  "etits",
  "fubu",
  "fuck buddy",
  

];

const LEET_MAP = {
  0: "o",
  1: "i",
  3: "e",
  4: "a",
  5: "s",
  7: "t",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalizeToken(token) {
  return token
    .toLowerCase()
    .split("")
    .map((char) => LEET_MAP[char] || char)
    .join("")
    .replace(/[^a-z]/g, "");
}

const NORMALIZED_SINGLE_WORD_TERMS = new Set(
  PROFANITY_TERMS.filter((term) => !term.includes(" ")).map(normalizeToken),
);

const NORMALIZED_PHRASE_TERMS = PROFANITY_TERMS.filter((term) =>
  term.includes(" "),
).map((term) =>
  term
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .join(" "),
);

function shouldMaskWord(rawWord) {
  if (!rawWord) return false;
  const normalized = normalizeToken(rawWord);
  if (!normalized) return false;
  return NORMALIZED_SINGLE_WORD_TERMS.has(normalized);
}

function maskWordPreservingLength(word) {
  const visibleChars = word.replace(/\s/g, "").length;
  if (!visibleChars) return word;
  const mask = "*".repeat(Math.max(3, visibleChars));
  return mask;
}

function sanitizeSingleWords(text) {
  return text.replace(/\S+/g, (word) =>
    shouldMaskWord(word) ? maskWordPreservingLength(word) : word,
  );
}

function normalizeTextForPhraseSearch(text) {
  return text
    .toLowerCase()
    .split("")
    .map((char) => LEET_MAP[char] || char)
    .join("")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsProfanityPhrase(normalizedText) {
  if (!normalizedText) return false;

  return NORMALIZED_PHRASE_TERMS.some((phrase) => {
    if (!phrase) return false;
    const pattern = new RegExp(
      `(^|\\s)${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\s|$)`,
      "i",
    );
    return pattern.test(normalizedText);
  });
}

function sanitizeProfanity(inputText) {
  if (typeof inputText !== "string" || !inputText.trim()) {
    return typeof inputText === "string" ? inputText : "";
  }

  const singleWordSanitized = sanitizeSingleWords(inputText);

  const normalizedText = normalizeTextForPhraseSearch(singleWordSanitized);
  if (!containsProfanityPhrase(normalizedText)) {
    return singleWordSanitized;
  }

  let phraseSanitized = singleWordSanitized;

  for (const phrase of PROFANITY_TERMS.filter((term) => term.includes(" "))) {
    const escaped = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escaped.replace(/\s+/g, "\\s+"), "gi");
    phraseSanitized = phraseSanitized.replace(regex, (match) =>
      "*".repeat(Math.max(4, match.replace(/\s/g, "").length)),
    );
  }

  return phraseSanitized;
}

module.exports = {
  sanitizeProfanity,
};
