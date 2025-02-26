require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');

const TMP_DIR = path.resolve(process.cwd(), process.env.TMP_DIR);

process.on("message", async (filePathes) => {

  const resultArray = [];
  await Promise.all(
    filePathes.map(async (filePath) => {
      const fileArr = JSON.parse(await fs.readFile(filePath));
      // safe push
      resultArray.push.apply(resultArray, fileArr);
      await fs.rm(filePath)
    })
  )

  const random = Math.trunc(Date.now() * Math.random());

  const newFilePath = path.resolve(TMP_DIR, `${random}.json`);

  await fs.writeFile(newFilePath, JSON.stringify(resultArray));

  process.send(newFilePath);
  process.exit();

});