package io.orbit.monitor.sql;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SelectValidatorTest {

    private final SelectValidator validator = new SelectValidator();

    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT 1",
            "select count(*) as qtd_pendentes from conciliacao where status = 'PENDENTE'",
            "SELECT a.id, b.nome FROM a JOIN b ON a.b_id = b.id ORDER BY a.id",
            "WITH ult AS (SELECT max(dt) dt FROM lote) SELECT dt FROM ult",
            "SELECT adquirente, count(*) FROM erro GROUP BY adquirente UNION ALL SELECT 'TOTAL', count(*) FROM erro",
            "SELECT * FROM v_fila WHERE obs = 'delete; drop table x'",
            "SELECT 1 FROM dual;",
            "SELECT \"Update\" FROM t"
    })
    void aceitaSelectsSeguros(String sql) {
        ValidatedSelect validated = validator.validate(sql);
        assertThat(validated.sql()).doesNotEndWith(";");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "DELETE FROM t",
            "UPDATE t SET a = 1",
            "INSERT INTO t VALUES (1)",
            "MERGE INTO t USING s ON (t.id = s.id) WHEN MATCHED THEN UPDATE SET t.a = s.a",
            "DROP TABLE t",
            "CREATE TABLE t (a int)",
            "ALTER TABLE t ADD b int",
            "TRUNCATE TABLE t",
            "CALL proc()",
            "EXEC sp_who",
            "GRANT SELECT ON t TO u"
    })
    void rejeitaDmlDdlEChamadas(String sql) {
        assertThatThrownBy(() -> validator.validate(sql)).isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejeitaMultiplosStatements() {
        assertThatThrownBy(() -> validator.validate("SELECT 1; SELECT 2"))
                .isInstanceOf(UnsafeSqlException.class)
                .hasMessageContaining("uma única");
    }

    @Test
    void rejeitaSelectSeguidoDeDml() {
        assertThatThrownBy(() -> validator.validate("SELECT 1; DELETE FROM t"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT DBMS_LOCK.SLEEP(10) FROM dual",
            "SELECT dbms_pipe.receive_message('x', 10) FROM dual",
            "SELECT UTL_HTTP.REQUEST('http://x') FROM dual",
            "SELECT pg_sleep(10)",
            "SELECT * FROM t WHERE 1 = (SELECT 1 FROM pg_sleep(5))",
            "SELECT xp_cmdshell('dir')",
            "SELECT * FROM t /* comentário */ WHERE x = utl_file.fopen('a','b','r')"
    })
    void rejeitaFuncoesDaListaNegra(String sql) {
        assertThatThrownBy(() -> validator.validate(sql))
                .isInstanceOf(UnsafeSqlException.class)
                .hasMessageContaining("não permitida");
    }

    @Test
    void funcaoProibidaDentroDeLiteralNaoConta() {
        assertThat(validator.validate("SELECT 'pg_sleep(10)' AS texto").sql()).contains("pg_sleep");
    }

    @Test
    void rejeitaSelectForUpdate() {
        assertThatThrownBy(() -> validator.validate("SELECT * FROM t FOR UPDATE"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejeitaSelectInto() {
        assertThatThrownBy(() -> validator.validate("SELECT * INTO copia FROM t"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejeitaCteQueModificaDados() {
        assertThatThrownBy(() -> validator.validate(
                "WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejeitaSqlVazioOuInvalido() {
        assertThatThrownBy(() -> validator.validate("   ")).isInstanceOf(UnsafeSqlException.class);
        assertThatThrownBy(() -> validator.validate("SELEC 1 FROM")).isInstanceOf(UnsafeSqlException.class);
    }
}
