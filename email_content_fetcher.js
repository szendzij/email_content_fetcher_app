const oracledb = require('oracledb');
const fs = require('fs');
require('dotenv').config();


async function fetchDataAndProcess() {
    let connection;

    try {
        oracledb.fetchAsString = [oracledb.CLOB];

        connection = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTION_STRING
        });

        const result = await connection.execute(
            `SELECT  
                temp.TEMPLATENAME AS SUBJECT,
                TO_CLOB(blob.content) AS CONTENT
             FROM SS_ADM_EMAIL_TEMPLATES temp 
             JOIN ss_blobs blob ON blob.ID = temp.TEMPLATECONTENT
             WHERE temp.VALIDTO IS NULL`
        );

        const text = result.rows.map(([subject, content]) => {
            const cleanedContent = content
                .replace(/"/g, '')
                .replace(/\r?\n|\r/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/^\s+|\s+$/g, '')
                .replace(/<br>(?=(?:\s*<[^>]*>)*$)|(<br>)|<[^>]*>/gi, (x, y) => y ? ' & ' : '');

            return `${subject}\n${cleanedContent}`;
        }).join("\n\n");

        fs.writeFileSync('output.txt', text, 'utf8');
        console.log('Przetworzony tekst zapisano w pliku output.txt');
    } catch (err) {
        console.error('Błąd podczas przetwarzania:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Błąd podczas zamykania połączenia:', err);
            }
        }
    }
}

fetchDataAndProcess();