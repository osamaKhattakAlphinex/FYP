/**
 * Pulls the most specific message out of a backend error response.
 *
 * The API returns either `{ errors: [{ field, message }] }` from an
 * express-validator chain or `{ message }` from an ErrorResponse, so both are
 * checked before falling back to the caller's default. Every progress screen
 * uses this so a validation failure reads as the reason rather than a generic
 * "something went wrong".
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
    const response = (error as { response?: { data?: unknown } })?.response?.data as
        | {
              errors?: Array<{ field?: string; message?: string }>
              message?: string
          }
        | undefined

    if (!response) return fallback

    const firstValidation = response.errors?.find((e) => e?.message)?.message
    if (firstValidation) return firstValidation

    return response.message || fallback
}
