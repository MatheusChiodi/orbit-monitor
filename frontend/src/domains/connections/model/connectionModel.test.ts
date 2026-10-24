import { describe, expect, it } from 'vitest';
import { emptyDraft, kindOfJdbcUrl, newId, toInput, validateDraft } from './connectionModel';

describe('connection model', () => {
  it('builds readable ids and avoids taken ones', () => {
    expect(newId('Orders DB')).toBe('orders-db');
    expect(newId('Pagamentos Produção')).toBe('pagamentos-producao');
    expect(newId('Default', ['default'])).toBe('default-2');
    expect(newId('***')).toBe('item');
  });

  it('guesses the database from the JDBC URL', () => {
    expect(kindOfJdbcUrl('jdbc:postgresql://h/db')).toBe('POSTGRES');
    expect(kindOfJdbcUrl('jdbc:oracle:thin:@//h:1521/X')).toBe('ORACLE');
    expect(kindOfJdbcUrl('postgres://h')).toBeNull();
  });

  it('requires a password for a new connection but not for a stored one', () => {
    const draft = { ...emptyDraft(), name: 'PG', jdbcUrl: 'jdbc:postgresql://h/db', username: 'orbit' };
    expect(validateDraft(draft, false).password?.key).toBe('monitorForm.connections.errors.passwordRequired');
    expect(validateDraft(draft, true)).toEqual({});
    expect(validateDraft({ ...draft, jdbcUrl: 'http://x' }, true).jdbcUrl).toBeDefined();
  });

  it('sends the password only when typed, or the environment variable instead', () => {
    const draft = { ...emptyDraft(), name: ' PG ', jdbcUrl: 'jdbc:postgresql://h/db', username: 'orbit' };
    expect(toInput(draft)).toEqual({ name: 'PG', jdbcUrl: 'jdbc:postgresql://h/db', username: 'orbit' });
    expect(toInput({ ...draft, password: 's3cret' }).password).toBe('s3cret');
    expect(toInput({ ...draft, password: 's3cret', useEnv: true, passwordEnv: 'PG_PASS' })).toMatchObject({ passwordEnv: 'PG_PASS' });
    expect(toInput({ ...draft, password: 's3cret', useEnv: true, passwordEnv: 'PG_PASS' }).password).toBeUndefined();
  });
});
