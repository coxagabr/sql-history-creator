const sql = require('mssql');
const config = require('./config.js');

async function createTrigger(tableName, triggerName, eventType, columnsInfo) {
  try {
    const pool = await sql.connect(config);

    // Check if the trigger already exists, and drop it if it does
    const triggerExists = await pool.request().query(`SELECT * FROM sys.triggers WHERE [name] = '${triggerName}'`);
    if (triggerExists.recordset.length > 0) {
      await pool.request().query(`DROP TRIGGER [dbo].[${triggerName}]`);
      console.log(`Trigger '${triggerName}' already existed and has been dropped.`);
    }

    const actionType = eventType === 'DELETE' ? 'DELETE' : (eventType === 'INSERT' ? 'INSERT' : 'UPDATE');

    // Generate the SELECT part of the trigger logic
    const selectPart = columnsInfo.map(column => `${column.name}`).join(', ');

    // Initialize the FROM part of the trigger logic
    let fromPart;

    // Set the FROM part based on the event type
    if (eventType === 'DELETE') {
      fromPart = 'deleted';
    } else {
      fromPart = 'inserted';
    }

    // Generate the trigger logic
    const triggerLogic = `      
      INSERT INTO [dbo].[${tableName}History] (
        ${selectPart},
        ActionType,
        ActionDate
      )
      SELECT 
        ${selectPart},
        '${actionType}' as ActionType,
        GETDATE() as ActionDate
      FROM ${fromPart}
    `;

    const createTriggerQuery = `
      CREATE TRIGGER [dbo].[${triggerName}]
      ON [dbo].[${tableName}]
      AFTER ${eventType}
      AS
      BEGIN
          ${triggerLogic}
      END
    `;

    const result = await pool.request().query(createTriggerQuery);
    console.log(`Trigger '${triggerName}' created successfully for table '${tableName}':`, result);
  } catch (err) {
    console.error(`Error creating trigger '${triggerName}' for table '${tableName}':`, err);
  }
}

module.exports = createTrigger;