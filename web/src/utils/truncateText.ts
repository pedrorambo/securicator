export function truncateText(text?: string, maxCharacters = 60) {
  if (!text) return text;
  if (text.length <= maxCharacters) {
    return text;
  }
  return text.slice(0, maxCharacters) + "...";
}
