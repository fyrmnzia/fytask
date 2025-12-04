import * as chrono from "chrono-node";

interface ParsedTask {
  title: string;
  dueDate?: Date;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags?: string[];
}

export function parseNaturalLanguageTask(input: string): ParsedTask {
  const result: ParsedTask = {
    title: input,
  };

  // Parse date/time using chrono-node
  const parsedDates = chrono.parse(input);
  if (parsedDates.length > 0) {
    result.dueDate = parsedDates[0].start.date();
    // Remove date text from title
    result.title = input.replace(parsedDates[0].text, "").trim();
  }

  // Detect priority keywords
  const priorityPatterns = {
    URGENT: /\b(urgent|asap|critical|emergency|immediately)\b/i,
    HIGH: /\b(high priority|important|crucial)\b/i,
    LOW: /\b(low priority|whenever|someday|maybe)\b/i,
  };

  for (const [priority, pattern] of Object.entries(priorityPatterns)) {
    if (pattern.test(input)) {
      result.priority = priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      result.title = result.title.replace(pattern, "").trim();
      break;
    }
  }

  // Extract hashtags as tags
  const hashtagPattern = /#(\w+)/g;
  const hashtags = input.match(hashtagPattern);
  if (hashtags) {
    result.tags = hashtags.map((tag) => tag.substring(1).toLowerCase());
    result.title = result.title.replace(hashtagPattern, "").trim();
  }

  // Clean up multiple spaces
  result.title = result.title.replace(/\s+/g, " ").trim();

  return result;
}
