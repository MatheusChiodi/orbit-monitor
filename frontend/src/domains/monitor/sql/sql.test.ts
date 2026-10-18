import { describe, expect, it } from 'vitest';
import { checkSelect } from './sql';

describe('checkSelect (guarda do lado do cliente; o backend valida de novo)', () => {
  it.each([
    'SELECT COUNT(*) QTD FROM FILA',
    '  select 1 from dual',
    'WITH x AS (SELECT 1 a FROM dual) SELECT a FROM x',
    'SELECT 1 FROM dual;',
    "SELECT 'DELETE' AS acao FROM log",
  ])('aceita: %s', (sql) => {
    expect(checkSelect(sql)).toBeNull();
  });

  it('vazio', () => {
    expect(checkSelect('   ')).toBe('Cole um SELECT');
  });
  it('só SELECT ou WITH', () => {
    expect(checkSelect('DELETE FROM fila')).toBe('Somente SELECT ou WITH');
    expect(checkSelect('EXEC sp_who')).toBe('Somente SELECT ou WITH');
  });
  it('sem múltiplos comandos', () => {
    expect(checkSelect('SELECT 1; DROP TABLE x')).toBe('Apenas um comando por consulta');
  });
  it('sem DML/DDL embutido', () => {
    expect(checkSelect('WITH d AS (DELETE FROM x RETURNING *) SELECT * FROM d')).toBe('Comando não permitido: DELETE');
  });
  it('lista negra de funções', () => {
    expect(checkSelect('SELECT pg_sleep(10)')).toBe('Função bloqueada: pg_sleep');
    expect(checkSelect('SELECT DBMS_LOCK.SLEEP(5) FROM dual')).toBe('Função bloqueada: DBMS_LOCK');
  });
});
