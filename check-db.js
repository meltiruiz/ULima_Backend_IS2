import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function checkSchema() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log("=== TABLES IN DB ===");
    console.log(tables.map(t => t.table_name).join(', '));

    const appUserCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'app_user';
    `;
    console.log("\n=== app_user COLUMNS ===");
    console.log(appUserCols.map(c => `${c.column_name} (${c.data_type})`).join('\n'));

    const migrations = await sql`
      SELECT * FROM drizzle LIMIT 10;
    `.catch(() => [{ error: 'No drizzle table found' }]);
    
    console.log("\n=== DRIZZLE MIGRATIONS APPLIED ===");
    console.log(migrations);

  } catch (error) {
    console.error("DB Error:", error.message);
  } finally {
    await sql.end();
  }
}

checkSchema();
