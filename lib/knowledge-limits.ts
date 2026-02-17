export function getKnowledgeLimits() {
  const maxCharsRaw = process.env.KNOWLEDGE_MAX_CHARS_PER_DOC;
  const maxDocsRaw = process.env.KNOWLEDGE_MAX_DOCS_PER_SERVICE;

  const maxChars = maxCharsRaw ? Number(maxCharsRaw) : 50_000;
  const maxDocs = maxDocsRaw ? Number(maxDocsRaw) : 5;

  return {
    maxCharsPerDoc:
      Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 50_000,
    maxDocsPerService: Number.isFinite(maxDocs) && maxDocs > 0 ? maxDocs : 50,
  };
}
