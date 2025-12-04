const fs = require("fs");
const path = require("path");

const source = "database.sqlite";
const destDir = "backups";

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
const dest = path.join(destDir, `database_backup_${timestamp}.sqlite`);

fs.copyFile(source, dest, (err) => {
  if (err) throw err;
  console.log(`✅ Database backed up to ${dest}`);
});

// Delete backups older than 7 days
fs.readdir(destDir, (err, files) => {
  files.forEach((file) => {
    const filePath = path.join(destDir, file);
    const stats = fs.statSync(filePath);
    const daysOld = (new Date() - stats.mtime) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted old backup: ${file}`);
    }
  });
});
