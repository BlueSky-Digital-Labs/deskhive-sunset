export class HttpError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data: unknown = null) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.data = data
  }
}

export function isConflictStatus(status: number): boolean {
  return status === 409
}

export function isConflictError(error: unknown): error is HttpError {
  return error instanceof HttpError && isConflictStatus(error.status)
}

export async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback
  }

  const record = data as Record<string, unknown>

  if (typeof record.detail === 'string') {
    return record.detail
  }

  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0]
  }

  const firstFieldError = Object.values(record).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  )
  if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
    return firstFieldError[0]
  }

  return fallback
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await parseJsonBody(response)

  if (!response.ok) {
    throw new HttpError(
      response.status,
      extractErrorMessage(data, `Request failed with status ${response.status}`),
      data,
    )
  }

  return data as T
}
