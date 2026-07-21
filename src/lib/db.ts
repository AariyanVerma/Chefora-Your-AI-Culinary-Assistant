import {
  sql as vercelSql,
  type QueryResult,
  type QueryResultRow,
} from '@vercel/postgres';

type SqlTag = <O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
) => Promise<QueryResult<O>>;

export const sql = vercelSql as unknown as SqlTag & typeof vercelSql;
