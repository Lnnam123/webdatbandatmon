const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('restaurant.db');
db.get("SELECT CONCAT('a', 'b') as val", (err, row) => {
  console.log(err ? err.message : row);
});
