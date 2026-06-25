/**
 * Minimal in-memory fake of the Supabase JS client — just enough of the
 * PostgREST query-builder surface that `processIntake` and friends use:
 *
 *   from(table).select(cols).eq().eq().order().limit().maybeSingle()
 *   from(table).insert(payload).select(cols).single()
 *   from(table).update(payload).eq().eq()
 *   from(table).insert(payload)                 // awaited directly
 *   from(table).select().eq().eq().eq().limit() // awaited -> array
 *
 * It is intentionally tiny and faithful only to the subset we exercise. The
 * builder is thenable, so `await query` resolves to `{ data, error }`, while
 * `.single()` / `.maybeSingle()` return a single row. Ordering is approximated
 * by an insertion sequence number (a stand-in for created_at).
 */

type Row = Record<string, unknown> & { id: string; __seq: number };
type Op = "select" | "insert" | "update" | "delete";

export class FakeSupabase {
  private tables: Record<string, Row[]> = {};
  private seq = 0;
  private counters: Record<string, number> = {};

  constructor(seed?: Record<string, Record<string, unknown>[]>) {
    if (seed) {
      for (const [table, rows] of Object.entries(seed)) {
        this.tables[table] = rows.map((r) => this.materialize(table, r));
      }
    }
  }

  private materialize(table: string, r: Record<string, unknown>): Row {
    const id = (r.id as string) ?? this.nextId(table);
    return { ...r, id, __seq: this.seq++ } as Row;
  }

  private nextId(table: string): string {
    this.counters[table] = (this.counters[table] ?? 0) + 1;
    return `${table}_${this.counters[table]}`;
  }

  rows(table: string): Row[] {
    return this.tables[table] ?? (this.tables[table] = []);
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  // Used by the builder.
  _insert(table: string, payload: Record<string, unknown> | Record<string, unknown>[]): Row[] {
    const list = Array.isArray(payload) ? payload : [payload];
    const created = list.map((p) => this.materialize(table, p));
    this.rows(table).push(...created);
    return created;
  }
}

class FakeQuery {
  private filters: { col: string; val: unknown }[] = [];
  private op: Op = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null =
    null;
  private orderAsc = true;
  private hasOrder = false;
  private limitN: number | null = null;

  constructor(
    private db: FakeSupabase,
    private table: string,
  ) {}

  select(_cols?: string) {
    if (this.op !== "insert" && this.op !== "update") this.op = "select";
    return this;
  }
  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Record<string, unknown>) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }
  order(_col: string, opts?: { ascending?: boolean }) {
    this.hasOrder = true;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private match(): Row[] {
    let rows = this.db
      .rows(this.table)
      .filter((r) => this.filters.every((f) => r[f.col] === f.val));
    if (this.hasOrder) {
      rows = [...rows].sort((a, b) =>
        this.orderAsc ? a.__seq - b.__seq : b.__seq - a.__seq,
      );
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private execute(): { data: unknown; error: { message: string } | null; rows: Row[] } {
    if (this.op === "insert") {
      const created = this.db._insert(this.table, this.payload!);
      return { data: created, error: null, rows: created };
    }
    if (this.op === "update") {
      const targets = this.match();
      for (const r of targets) Object.assign(r, this.payload);
      return { data: targets, error: null, rows: targets };
    }
    if (this.op === "delete") {
      const all = this.db.rows(this.table);
      const keep = all.filter(
        (r) => !this.filters.every((f) => r[f.col] === f.val),
      );
      const removed = all.length - keep.length;
      this.db.rows(this.table).length = 0;
      this.db.rows(this.table).push(...keep);
      return { data: null, error: null, rows: [] as Row[], ...{ count: removed } } as never;
    }
    const rows = this.match();
    return { data: rows, error: null, rows };
  }

  single() {
    const { rows } = this.execute();
    if (rows.length === 0) {
      return Promise.resolve({ data: null, error: { message: "No rows" } });
    }
    return Promise.resolve({ data: rows[0], error: null });
  }
  maybeSingle() {
    const { rows } = this.execute();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  // Thenable: `await query` resolves to { data, error } where data is an array
  // for selects/updates/inserts.
  then<T>(
    onF: (v: { data: unknown; error: { message: string } | null }) => T,
  ): T {
    const { data, error } = this.execute();
    return onF({ data, error });
  }
}
