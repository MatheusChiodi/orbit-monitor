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
            "select count(*) as pending_qty from reconciliation where status = 'PENDING'",
            "SELECT a.id, b.name FROM a JOIN b ON a.b_id = b.id ORDER BY a.id",
            "WITH last_batch AS (SELECT max(dt) dt FROM batch) SELECT dt FROM last_batch",
            "SELECT acquirer, count(*) FROM error_log GROUP BY acquirer UNION ALL SELECT 'TOTAL', count(*) FROM error_log",
            "SELECT * FROM v_queue WHERE obs = 'delete; drop table x'",
            "SELECT 1 FROM dual;",
            "SELECT \"Update\" FROM t"
    })
    void acceptsSafeSelects(String sql) {
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
    void rejectsDmlDdlAndCalls(String sql) {
        assertThatThrownBy(() -> validator.validate(sql)).isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejectsMultipleStatements() {
        assertThatThrownBy(() -> validator.validate("SELECT 1; SELECT 2"))
                .isInstanceOf(UnsafeSqlException.class)
                .hasMessageContaining("single query");
    }

    @Test
    void rejectsSelectFollowedByDml() {
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
            "SELECT * FROM t /* comment */ WHERE x = utl_file.fopen('a','b','r')"
    })
    void rejectsBlocklistedFunctions(String sql) {
        assertThatThrownBy(() -> validator.validate(sql))
                .isInstanceOf(UnsafeSqlException.class)
                .hasMessageContaining("not allowed");
    }

    @Test
    void blocklistedFunctionInsideLiteralIsIgnored() {
        assertThat(validator.validate("SELECT 'pg_sleep(10)' AS label").sql()).contains("pg_sleep");
    }

    @Test
    void rejectsSelectForUpdate() {
        assertThatThrownBy(() -> validator.validate("SELECT * FROM t FOR UPDATE"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejectsSelectInto() {
        assertThatThrownBy(() -> validator.validate("SELECT * INTO copy_t FROM t"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejectsDataModifyingCte() {
        assertThatThrownBy(() -> validator.validate(
                "WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d"))
                .isInstanceOf(UnsafeSqlException.class);
    }

    @Test
    void rejectsBlankOrInvalidSql() {
        assertThatThrownBy(() -> validator.validate("   ")).isInstanceOf(UnsafeSqlException.class);
        assertThatThrownBy(() -> validator.validate("SELEC 1 FROM")).isInstanceOf(UnsafeSqlException.class);
    }
}
