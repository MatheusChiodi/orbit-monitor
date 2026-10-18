-- Baseline do schema do Orbit; tabelas de cada domínio entram em migrações seguintes.
CREATE TABLE orbit_meta (
    meta_key   VARCHAR(64) PRIMARY KEY,
    meta_value VARCHAR(255) NOT NULL
);
INSERT INTO orbit_meta (meta_key, meta_value) VALUES ('schema', 'v1');
