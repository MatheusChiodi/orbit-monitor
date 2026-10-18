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
 * Modo seguro do monitor SQL: aceita somente uma consulta SELECT/WITH, sem DML/DDL/CALL/EXEC,
 * sem SELECT INTO/FOR UPDATE e sem funções da lista negra (DBMS_*, UTL_*, pg_sleep, xp_cmdshell...).
 * Combina a árvore do JSqlParser com uma checagem textual sobre o SQL sem literais e comentários.
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
            throw new UnsafeSqlException("Informe um SELECT");
        }
        String trimmed = SqlText.stripTrailingSemicolons(sql);
        String code = SqlText.codeOnly(trimmed);

        Matcher fn = BLACKLISTED_FUNCTIONS.matcher(code);
        if (fn.find()) {
            throw new UnsafeSqlException("Função não permitida no modo seguro: " + fn.group(1));
        }
        if (code.contains(";")) {
            throw new UnsafeSqlException("Envie uma única consulta (sem ';' separando comandos)");
        }
        Matcher kw = FORBIDDEN_KEYWORDS.matcher(code);
        if (kw.find()) {
            throw new UnsafeSqlException("Comando não permitido: " + kw.group(1).toUpperCase(Locale.ROOT)
                    + ". Somente SELECT/WITH");
        }
        checkTree(parse(trimmed));
        return new ValidatedSelect(trimmed);
    }

    private static Statement parse(String sql) {
        try {
            Statements statements = CCJSqlParserUtil.parseStatements(sql);
            if (statements.size() != 1) {
                throw new UnsafeSqlException("Envie uma única consulta (sem ';' separando comandos)");
            }
            return statements.getFirst();
        } catch (JSQLParserException e) {
            throw new UnsafeSqlException("SELECT inválido: não foi possível interpretar a consulta");
        }
    }

    private static void checkTree(Statement statement) {
        if (!(statement instanceof Select select)) {
            throw new UnsafeSqlException("Somente SELECT/WITH é permitido");
        }
        List<WithItem<?>> withItems = select.getWithItemsList();
        if (withItems != null) {
            for (WithItem<?> item : withItems) {
                if (!(item.getParenthesedStatement() instanceof Select)) {
                    throw new UnsafeSqlException("WITH não pode modificar dados");
                }
            }
        }
        if (select.getForMode() != null) {
            throw new UnsafeSqlException("SELECT ... FOR UPDATE não é permitido (trava linhas no alvo)");
        }
        if (select instanceof PlainSelect plain && plain.getIntoTables() != null) {
            throw new UnsafeSqlException("SELECT INTO não é permitido");
        }
    }
}
