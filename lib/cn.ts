/** Tiny class-name joiner. Keeps the dependency list short. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
