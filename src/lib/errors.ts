export class AppError extends Error {}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AppError(message);
}
