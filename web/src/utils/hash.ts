export function hash(content: string | Uint8Array) {
  if (typeof content === "string") {
    const parsedContent = content.split("").map((char) => char.charCodeAt(0));
    return parsedContent.reduce((acc, curr) => acc + curr, 1);
  } else {
    return content.reduce((acc, curr) => acc + curr, 3);
  }
}
