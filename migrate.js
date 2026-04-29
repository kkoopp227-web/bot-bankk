 const { QuickDB } = require('quick.db');
const mongoose = require('mongoose');
require('dotenv').config();

const dataSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Data = mongoose.model('Data', dataSchema);

async function migrate() {
    console.log('Starting migration...');
    
    // 1. Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas. ✅');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }

    // 2. Open SQLite Database
    const sqliteDB = new QuickDB();
    const allData = await sqliteDB.all();
    console.log(`Found ${allData.length} records in SQLite.`);

    // 3. Transfer Data
    let count = 0;
    for (const entry of allData) {
        try {
            await Data.findOneAndUpdate(
                { key: entry.id },
                { value: entry.value },
                { upsert: true }
            );
            count++;
            if (count % 10 === 0) console.log(`Migrated ${count} records...`);
        } catch (err) {
            console.error(`Failed to migrate key ${entry.id}:`, err);
        }
    }

    console.log(`Migration finished! Successfully moved ${count} records. 🎉`);
    process.exit(0);
}

migrate();
