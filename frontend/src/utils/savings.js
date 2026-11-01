/**
 * Gullak ledger helpers.
 *
 * The server stores a split withdrawal as one row per category, all sharing a
 * `groupId` (see the backend's `allocateWithdrawal`). The ledger is the single
 * source of truth, so the UI folds those rows back into the one transaction the
 * user actually made — without ever changing the numbers underneath.
 */

/** The amount a row moves: deposits add, withdrawals take away. */
export function signedAmount(transaction) {
  const value = Number(transaction?.amount) || 0
  return transaction?.type === 'DEPOSIT' ? value : -value
}

/**
 * Collapses rows that share a `groupId` into a single logical entry carrying
 * its per-category `allocations`. Ordinary rows pass straight through.
 *
 * The order of first appearance is preserved, so an already-sorted list stays
 * sorted.
 */
export function groupTransactions(rows = []) {
  const logical = []
  const byGroup = new Map()

  for (const row of rows) {
    if (!row.groupId) {
      logical.push({ ...row, allocations: null, entryIds: [row.id] })
      continue
    }

    const existing = byGroup.get(row.groupId)
    if (existing) {
      existing.amount = Number(existing.amount) + Number(row.amount)
      existing.entryIds.push(row.id)
      existing.allocations.push({
        goalId: row.goalId,
        goalName: row.goalName,
        amount: Number(row.amount),
      })
      continue
    }

    const entry = {
      ...row,
      amount: Number(row.amount),
      allocations: [{ goalId: row.goalId, goalName: row.goalName, amount: Number(row.amount) }],
      entryIds: [row.id],
    }
    byGroup.set(row.groupId, entry)
    logical.push(entry)
  }

  return logical
}

/** True when this logical entry is a withdrawal split across categories. */
export function isSplitWithdrawal(entry) {
  return Boolean(entry?.groupId) && (entry.allocations?.length ?? 0) > 0
}
