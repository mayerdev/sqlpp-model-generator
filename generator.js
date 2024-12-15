const mysql = require('mysql2/promise');
const config = require('./config.json');
const fs = require('fs');

const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1);

const getDatatype = (sql_data_type, sql_column_type) => {
    if (sql_data_type === 'int') return 'sqlpp::integer';
    else if (sql_data_type === 'bigint') return 'sqlpp::bigint';
    else if (sql_data_type === 'smallint') return 'sqlpp::integer'; // sqlpp11 не имеет smallint напрямую
    else if (sql_data_type === 'tinyint' && sql_column_type === 'tinyint(1)') return 'sqlpp::boolean';
    else if (sql_data_type === 'tinyint') return 'sqlpp::integer'; // tinyint интерпретируется как integer
    else if (sql_data_type === 'mediumint') return 'sqlpp::integer'; // mediumint интерпретируется как integer
    else if (sql_data_type === 'decimal' || sql_data_type === 'numeric') return 'sqlpp::floating_point';
    else if (sql_data_type === 'float') return 'sqlpp::floating_point';
    else if (sql_data_type === 'double' || sql_data_type === 'real') return 'sqlpp::floating_point';
    else if (sql_data_type === 'char') return 'sqlpp::text'; // sqlpp11 использует text для строковых данных
    else if (sql_data_type === 'varchar') return 'sqlpp::text';
    else if (sql_data_type === 'text') return 'sqlpp::text';
    else if (sql_data_type === 'tinytext') return 'sqlpp::text';
    else if (sql_data_type === 'mediumtext') return 'sqlpp::text';
    else if (sql_data_type === 'longtext') return 'sqlpp::text';
    else if (sql_data_type === 'date') return 'sqlpp::date';
    else if (sql_data_type === 'datetime') return 'sqlpp::time_point';
    else if (sql_data_type === 'timestamp') return 'sqlpp::time_point';
    else if (sql_data_type === 'time') return 'sqlpp::time_of_day';
    else if (sql_data_type === 'year') return 'sqlpp::integer'; // год интерпретируется как integer
    else if (sql_data_type === 'enum') return 'sqlpp::text'; // sqlpp11 не поддерживает enum напрямую
    else if (sql_data_type === 'set') return 'sqlpp::text'; // sqlpp11 не поддерживает set напрямую
    else if (sql_data_type === 'binary') return 'sqlpp::blob';
    else if (sql_data_type === 'varbinary') return 'sqlpp::blob';
    else if (sql_data_type === 'blob') return 'sqlpp::blob';
    else if (sql_data_type === 'tinyblob') return 'sqlpp::blob';
    else if (sql_data_type === 'mediumblob') return 'sqlpp::blob';
    else if (sql_data_type === 'longblob') return 'sqlpp::blob';
}

const generateTraits = sql_item => {
    const traits = [];

    traits.push(getDatatype(sql_item.DATA_TYPE, sql_item.COLUMN_TYPE));
    if(sql_item.IS_NULLABLE === 'YES') traits.push('sqlpp::tag::can_be_null');
    if(sql_item.EXTRA.includes('auto_increment')) {
        traits.push('sqlpp::tag::must_not_insert');
        traits.push('sqlpp::tag::must_not_update')
    }

    return traits.join(', ');
}

const buildStructFields = (namespace, fields) => {
    const result = [];
    for(field of fields) result.push(`${namespace}::${capitalize(field)}`);

    return result.join(', ');
}

async function main() {
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database
    });

    const tableName = process.argv[2];
    const outputFile = process.argv[3];
    if(!tableName) return console.error('Usage: node generator.js <table_name> <file?>');

    const [rows] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, EXTRA, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, COLUMN_TYPE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [connection.config.database, tableName]);

    let out = '#pragma once\n\n';
    out += 'namespace models {\n';
    out += `\tnamespace ${capitalize(tableName)}_ {\n`;
    
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i];

        out += `\t\tstruct ${capitalize(row.COLUMN_NAME)} {\n`;
        out += `\t\t\tstruct _alias_t {\n`;
        out += `\t\t\t\tstatic constexpr const char _literal[] = "${row.COLUMN_NAME}";\n`;
        out += `\t\t\t\tusing _name_t = sqlpp::make_char_sequence<sizeof(_literal), _literal>;\n`;
        out += `\t\t\t\ttemplate <typename T>\n`;
        out += `\t\t\t\tstruct _member_t {\n`;
        out += `\t\t\t\t\tT ${row.COLUMN_NAME};\n`;
        out += `\t\t\t\t\tT& operator()() { return ${row.COLUMN_NAME}; }\n`;
        out += `\t\t\t\t\tconst T& operator()() const { return ${row.COLUMN_NAME}; }\n`;
        out += `\t\t\t\t};\n`;
        out += `\t\t\t};\n`;
        out += `\n`;
        out += `\t\t\tusing _traits = sqlpp::make_traits<${generateTraits(row)}>;\n`;
        out += `\t\t};\n`;
        if(i !== rows.length - 1) out += `\n`;
    }

    out += `\t}\n`;
    out += `\n`;
    out += `\tstruct ${capitalize(tableName)} : sqlpp::table_t<${capitalize(tableName)}, ${buildStructFields(capitalize(tableName) + '_', rows.map(item => item.COLUMN_NAME))}> {\n`;
    out += `\t\tstruct _alias_t {\n`;
    out += `\t\t\tstatic constexpr const char _literal[] = "${tableName}";\n`;
    out += `\t\t\tusing _name_t = sqlpp::make_char_sequence<sizeof(_literal), _literal>;\n`;
    out += `\t\t\ttemplate <typename T>\n`;
    out += `\t\t\tstruct _member_t {\n`;
    out += `\t\t\t\tT ${tableName};\n`;
    out += `\t\t\t\tT& operator()() { return ${tableName}; }\n`;
    out += `\t\t\t\tconst T& operator()() const { return ${tableName}; }\n`;
    out += `\t\t\t};\n`;
    out += `\t\t};\n`;
    out += `\t};\n`;
    out += `\n`;
    out += `\ttemplate <typename RowType>\n`;
    out += `\tnlohmann::json ${tableName}_to_json(const RowType & row) {\n`;
    out += `\t\tnlohmann::json result;\n`;
    out += `\n`;

    for(let i = 0; i < rows.length; i++) {
        const row = rows[i];
        out += `\t\tresult["${row.COLUMN_NAME}"] = row.${row.COLUMN_NAME}.value();\n`;
    }

    out += `\n`;
    out += `\t\treturn result;\n`;
    out += `\t}\n`;
    out += `}\n`;

    if(outputFile) {
        fs.writeFileSync(outputFile, out);
        console.log('done');
    } else {
        console.log(out);
    }
    
}

main().then(() => process.exit(0));