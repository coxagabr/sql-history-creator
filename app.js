const sql = require('mssql');
const config = require('./config.js');
const createTrigger = require('./createTrigger.js');
const createHistoryTable = require('./createHistoryTable.js');

async function createHistoryTables() {
  let pool;

  try {
    pool = await sql.connect(config);

    const tables = ['' /* Add table names here */];

    const eventTypes = ['INSERT', 'UPDATE', 'DELETE'];

    for (const tableName of tables) {
      console.log(`Creating triggers and history table for table '${tableName}'...`);

      await createHistoryTable(tableName, pool);

      for (const eventType of eventTypes) {
        const triggerName = `trg_${tableName}After${eventType}`;
        const columnNamesResult = await pool.request().query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}';
        `);

        const columnsInfo = columnNamesResult.recordset.map(row => ({
          name: row.COLUMN_NAME,
        }));

        await createTrigger(tableName, triggerName, eventType, columnsInfo);
        console.log(`Trigger '${triggerName}' created successfully for table '${tableName}' and event type '${eventType}'`);
      }
    }
  } catch (err) {
    console.error('Error during history table and trigger creation:', err.message || err);
  } finally {
    // Close the connection if it was successfully opened
    if (pool) {
      await pool.close();
    }
  }
}

createHistoryTables().catch(err => console.error('Error:', err));