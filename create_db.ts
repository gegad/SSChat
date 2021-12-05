const sqlite3 = require("sqlite3");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let db = new sqlite3.Database('./users.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err: Error) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the users database.');
    }
});
db.run("CREATE TABLE users (username text, passwordhash text, token text)", (err: Error) => {
    if (err) {
        console.log(err);
    } else {
        console.log("users table created in database");
    }
});

(async () => {
    for (let i: number = 0; i < 5; i++) {
        let name: string = 'user' + i;
        let pswd: string = 'pswd' + i;
        let pswd_hash: string = await bcrypt.hash(pswd, 10);
        let token: string = await bcrypt.hash('token' + i, 10);
        db.run(`INSERT INTO users (username, passwordhash, token) VALUES ('${name}', '${pswd_hash}', '${token}')`, (err: Error) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`user${i} row created`);
            }
        });
    }
}) ();
