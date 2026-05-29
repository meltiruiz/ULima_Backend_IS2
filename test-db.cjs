const postgres = require('postgres');
const sql = postgres('postgresql://uladmin:wrongpass123@api-mobile-db.cbk2ge28uibe.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require', { max: 1 });
sql`select 1 as ok`
  .then(res => console.log('Success:', res))
  .catch(err => console.error('Error:', err))
  .finally(() => sql.end());
