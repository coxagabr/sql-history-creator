const sql = require('mssql');
const config = require('./config.js');

async function createHistoryTable(originalTableName) {
  const historyTableName = `${originalTableName}History`;

  // Query to get column names, types, and sizes for the original table
  const getColumnNamesAndTypesQuery = `
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${originalTableName}'
  `;

  try {
    const pool = await sql.connect(config);

    // Execute query to get column names, types, and sizes
    const result = await pool.request().query(getColumnNamesAndTypesQuery);

    // Extract column names, types, and sizes from the result
    const columnsInfo = result.recordset.map(row => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE.toLowerCase(),
      size: row.CHARACTER_MAXIMUM_LENGTH,
    }));

    // Generate column definitions with data types and sizes
    const columnDefinitions = columnsInfo.map(column => {
      if (column.type === 'nvarchar') {
        return `${column.name} ${column.type}(${column.size !== -1 ? column.size : 'MAX'})`;
      } else {
        return `${column.name} ${column.type}`;
      }
    }).join(', ');

    // Check if the history table already exists, and drop it if it does
    const historyTableExists = await pool.request().query(`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${historyTableName}'`);
    if (historyTableExists.recordset.length > 0) {
      await pool.request().query(`DROP TABLE [dbo].[${historyTableName}]`);
      console.log(`History table '${historyTableName}' already existed and has been dropped.`);
    }

    // Create history table query with dynamic column names, data types, and sizes
    const createHistoryTableQuery = `
      CREATE TABLE [dbo].[${historyTableName}] (
        HistoryId INT IDENTITY(1,1) PRIMARY KEY,
        ${columnDefinitions},
        ActionType NVARCHAR(255),
        ActionDate DATETIME
      )
    `;

    // Create history table
    const createResult = await pool.request().query(createHistoryTableQuery);
    console.log(`History table '${historyTableName}' created successfully:`, createResult);
  } catch (err) {
    console.error(`Error creating history table '${historyTableName}':`, err);
  }
}

module.exports = createHistoryTable;
