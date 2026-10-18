import { describe, expect, it } from 'vitest';
import { checkSelect } from './sql';

describe('checkSelect (client-side guard; the backend validates again)', () => {
  it.each([
    'SELECT COUNT(*) QTY FROM QUEUE',
    '  select 1 from dual',
    'WITH x AS (SELECT 1 a FROM dual) SELECT a FROM x',
    'SELECT 1 FROM dual;',
    "SELECT 'DELETE' AS action FROM log",
  ])('accepts: %s', (sql) => {
    expect(checkSelect(sql)).toBeNull();
  });

  it('empty', () => {
    expect(checkSelect('   ')).toEqual({ key: 'sql.errors.empty' });
  });
  it('SELECT or WITH only', () => {
    expect(checkSelect('DELETE FROM queue')).toEqual({ key: 'sql.errors.notSelect' });
    expect(checkSelect('EXEC sp_who')).toEqual({ key: 'sql.errors.notSelect' });
  });
  it('no multiple statements', () => {
    expect(checkSelect('SELECT 1; DROP TABLE x')).toEqual({ key: 'sql.errors.multiple' });
  });
  it('no embedded DML/DDL', () => {
    expect(checkSelect('WITH d AS (DELETE FROM x RETURNING *) SELECT * FROM d')).toEqual({
      key: 'sql.errors.forbidden',
      params: { word: 'DELETE' },
    });
  });
  it('function blocklist', () => {
    expect(checkSelect('SELECT pg_sleep(10)')).toEqual({ key: 'sql.errors.blocked', params: { name: 'pg_sleep' } });
    expect(checkSelect('SELECT DBMS_LOCK.SLEEP(5) FROM dual')).toEqual({
      key: 'sql.errors.blocked',
      params: { name: 'DBMS_LOCK' },
    });
  });
});
