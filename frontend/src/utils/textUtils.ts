/**
 * Strip HTML tags from a string and return plain text
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, "");

  // Decode HTML entities
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  text = textarea.value;

  // Replace multiple spaces/newlines with single space
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Truncate text to a specific length and add ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Get plain text preview from HTML content
 */
export function getTextPreview(html: string, maxLength: number = 150): string {
  const plainText = stripHtml(html);
  return truncateText(plainText, maxLength);
}
