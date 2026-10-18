package io.orbit.monitor.sql;

import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.Statements;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.Select;
import net.sf.jsqlparser.statement.select.WithItem;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SQL monitor safe mode: accepts a single SELECT/WITH query only, with no DML/DDL/CALL/EXEC,
 * no SELECT INTO/FOR UPDATE and no blocklisted functions (DBMS_*, UTL_*, pg_sleep, xp_cmdshell...).
 * Combines the JSqlParser tree with a textual check on the SQL stripped of literals and comments.
 */
public class SelectValidator {

    private static final Pattern BLACKLISTED_FUNCTIONS = Pattern.compile(
            "\\b(DBMS_\\w+|UTL_\\w+|PG_SLEEP\\w*|PG_READ_\\w+|PG_LS_DIR|PG_TERMINATE_BACKEND|PG_CANCEL_BACKEND"
                    + "|LO_IMPORT|LO_EXPORT|DBLINK\\w*|XP_\\w+|SP_OA\\w+|OPENROWSET|OPENDATASOURCE|OPENQUERY"
                    + "|SLEEP|BENCHMARK|LOAD_FILE|SYS_EXEC|SYS_EVAL)\\b",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern FORBIDDEN_KEYWORDS = Pattern.compile(
            "\\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|DROP|CREATE|ALTER|TRUNCATE|RENAME|GRANT|REVOKE|EXEC|EXECUTE"
                    + "|CALL|COMMIT|ROLLBACK|SAVEPOINT|BEGIN|DECLARE|INTO|LOCK|WAITFOR|SHUTDOWN|KILL|COPY)\\b",
            Pattern.CASE_INSENSITIVE);

    public ValidatedSelect validate(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new UnsafeSqlException("required", "A SELECT is required");
        }
        String trimmed = SqlText.stripTrailingSemicolons(sql);
        String code = SqlText.codeOnly(trimmed);

        Matcher fn = BLACKLISTED_FUNCTIONS.matcher(code);
        if (fn.find()) {
            throw new UnsafeSqlException("function-not-allowed", "Function not allowed in safe mode: " + fn.group(1),
                    fn.group(1));
        }
        if (code.contains(";")) {
            throw new UnsafeSqlException("single-statement", "Send a single query (no ';' between statements)");
        }
        Matcher kw = FORBIDDEN_KEYWORDS.matcher(code);
        if (kw.find()) {
            String keyword = kw.group(1).toUpperCase(Locale.ROOT);
            throw new UnsafeSqlException("statement-not-allowed", "Statement not allowed: " + keyword
                    + ". Only SELECT/WITH", keyword);
        }
        checkTree(parse(trimmed));
        return new ValidatedSelect(trimmed);
    }

    private static Statement parse(String sql) {
        try {
            Statements statements = CCJSqlParserUtil.parseStatements(sql);
            if (statements.size() != 1) {
                throw new UnsafeSqlException("single-statement", "Send a single query (no ';' between statements)");
            }
            return statements.getFirst();
        } catch (JSQLParserException e) {
            throw new UnsafeSqlException("unparsable", "Invalid SELECT: the query could not be parsed");
        }
    }

    private static void checkTree(Statement statement) {
        if (!(statement instanceof Select select)) {
            throw new UnsafeSqlException("select-only", "Only SELECT/WITH is allowed");
        }
        List<WithItem<?>> withItems = select.getWithItemsList();
        if (withItems != null) {
            for (WithItem<?> item : withItems) {
                if (!(item.getParenthesedStatement() instanceof Select)) {
                    throw new UnsafeSqlException("cte-modifies-data", "WITH must not modify data");
                }
            }
        }
        if (select.getForMode() != null) {
            throw new UnsafeSqlException("for-update",
                    "SELECT ... FOR UPDATE is not allowed (it locks rows on the target)");
        }
        if (select instanceof PlainSelect plain && plain.getIntoTables() != null) {
            throw new UnsafeSqlException("select-into", "SELECT INTO is not allowed");
        }
    }
}
