/** A cell value as returned by the Apps Script endpoint (unformatted). */
export type Cell = string | number | boolean | null | undefined

/** One table row, keyed by column header. */
export type Row = Record<string, Cell>

/** The endpoint payload: every public structured table, keyed by table name. */
export type Database = Partial<
  Record<'Teams' | 'Players' | 'Matches' | 'MatchTeams' | 'MatchParticipants' | 'Champions', Row[]>
> &
  Record<string, Row[] | undefined>
