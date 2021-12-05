const sqlite3 = require("sqlite3");

exports.db = new sqlite3.Database('./users.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err: Error) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the users database.');
    }
});

exports.getUserData = async function (db: any, username: string, dataname: string) {
    try {
        return await new Promise(function(resolve, reject) {
            db.get(`SELECT ${dataname} data FROM users WHERE username = ?`, username, (err: Error, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row?.data);
                }
            })
        });
    } catch (err) {
        return '';
    }
}

exports.updateUserToken = function (db: any, user: string, token: string) {
    db.run(`UPDATE users SET token = ? WHERE username = ?`, [token, user], (err: Error) => {
        if (err) {
            console.log(err)
        }
        console.log(`Updated token for ${user}`);
    });            
}
