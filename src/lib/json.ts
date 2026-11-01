export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

export function fromJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
