export function generateFingerprint(obj: unknown, prefix = ""): string[] {
  let paths: string[] = [];
  
  // Verify if JSON
  if (typeof obj !== "object" || obj === null) {
      return paths;
  }
  
  // Object to tuple conversion
  const entries: [string, unknown][] = Object.entries(obj as Record<string, unknown>);
  
  for (const [key, value] of entries) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths = paths.concat(generateFingerprint(value, newPrefix));
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        paths = paths.concat(generateFingerprint(value[0], `${newPrefix}[]`));
      } else {
        paths.push(`${newPrefix}[]:empty`);
      }
    } else {
      paths.push(`${newPrefix}:${typeof value}`);
    }
  }
  return paths;
}