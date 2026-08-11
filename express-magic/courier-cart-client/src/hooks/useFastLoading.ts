/**
 * Data-heavy screens must render their table/list shell immediately. Queries still
 * run in the background and populate the visible shell when data arrives, but a
 * slow API must never replace the whole workspace with a blocking skeleton.
 */
export function useFastLoading(isLoading: boolean) {
  void isLoading
  return false
}
