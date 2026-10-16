/**
 * Normalizes any thrown/unknown value into a safe, user-facing message.
 *
 * Network failures (fetch throws a `TypeError` such as "Failed to fetch" or
 * "NetworkError when attempting to fetch resource") are converted into a
 * friendly message, and non-Error values never leak as "[object Object]".
 */
export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request took too long and was cancelled. Please try again.';
  }

  if (error instanceof TypeError) {
    return 'Network error: could not reach the server. Check your connection and try again.';
  }

  if (error instanceof Error) {
    const message = error.message?.trim();
    if (!message) return fallback;
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
      return 'Network error: could not reach the server. Check your connection and try again.';
    }
    return message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
}

export default toUserMessage;
