require('dotenv').config();

const fsp = require('fs/promises');
const fs = require('fs');
const chp = require("child_process");
const path = require("path");

const MAX_WORKERS = +process.env.MAX_WORKERS || 20;
const CHUNK_SIZE = +process.env.CHUNK_SIZE || 50;
const OUT_DIR = path.resolve(process.cwd(), process.env.OUT_DIR);
const TMP_DIR = path.resolve(process.cwd(), process.env.TMP_DIR);
const WORKER_DIR = path.resolve(process.cwd(), process.env.WORKER_DIR);


(async () => {

  await recreateDir(OUT_DIR);

  const classified = await classifyRawJsons();

  const dates = new Set();

  for (const [name, filesArray] of Object.entries(classified)) {
    if (!filesArray.length) {
      continue;
    }

    console.log(`Combining files: ${name}`);
    const combinedData = await combineJsonFiles(filesArray);

    console.log(`Combining by date: ${name}`)
    const currDates = await combineArrayByDate(combinedData, name);
    currDates.forEach(d => dates.add(d));

    console.log(`DONE: ${name}`)

  }

  await fsp.writeFile(
    path.resolve(OUT_DIR, 'dates.json'),
    JSON.stringify(
      Array.from(dates).sort((d1, d2) => new Date(d1).valueOf() - new Date(d2).valueOf())
    )
  )

  await fsp.rm(TMP_DIR, { recursive: true, force: true });


})()

async function writeBigJsonObject(path, obj) {
  const stream = fs.createWriteStream(path);
  const entries = Object.entries(obj);
  const chunks = chunkArray(entries);
  stream.write('{\n');
  chunks.forEach((chunk, i) => {
    stream.write(
      chunk.map(([key, value]) => (
        `"${key}": ${JSON.stringify(value)}`
      )).join(',\n')
    )
    if (i !== chunks.length) {
      stream.write(',\n');
    }
  })

  stream.write('\n\r}');
  stream.close();

}

async function combineArrayByDate(arr, name) {
  const combined = {};
  arr.forEach((item) => {
    const key = new Date(item.timestamp * 1000).toDateString();
    if (combined[key]) {
      combined[key].push(item);
    } else {
      combined[key] = [item];
    }
  });

  const namedPath = path.resolve(OUT_DIR, name);

  await recreateDir(namedPath);

  await Promise.all(
    Object.entries(combined).map(async ([key, value]) => {
      await fsp.writeFile(
        path.resolve(namedPath, `${key}.json`),
        JSON.stringify(value)
      )
    })
  );

  return Object.keys(combined);
}

async function combineJsonFiles(files) {
  if (!files.length) {
    return null;
  }

  const chunks = chunkArray(files);
  let chunkInd = 0;
  const workersPoll = [];
  const newFilePathes = [];

  for (let i = 0; i < MAX_WORKERS && chunkInd < chunks.length; i++) {
    workersPoll[i] = startWorker(chunks[chunkInd], i);
    chunkInd++;
  }

  while (chunkInd < chunks.length) {
    const { wokerInd, newFilePath } = await Promise.race(workersPoll);
    workersPoll[wokerInd] = startWorker(chunks[chunkInd], wokerInd);
    newFilePath && newFilePathes.push(newFilePath);
    chunkInd++;
  }

  const waitedResults = (await Promise.all(workersPoll))
    .map((res) => res.newFilePath)
    .filter((file) => !!file);

  newFilePathes.push(...waitedResults);

  if (newFilePathes.length === 1) {
    const data = JSON.parse(await fsp.readFile(newFilePathes[0]));
    await fsp.rm(newFilePathes[0]);
    return data;
  } else {
    return combineJsonFiles(newFilePathes);
  }

}

async function startWorker(dataChunk, wokerInd) {
  return new Promise((resolve) => {
    try {
      const child = chp.fork(WORKER_DIR);

      child.on("message", (newFilePath) => {
        resolve({ wokerInd, newFilePath });
      })

      child.send(dataChunk);
    } catch (error) {
      console.error(error);
      resolve({ wokerInd, newFilePath: null });
    }
  })
}

async function classifyRawJsons() {
  const rawJsonFiles = await fsp.readdir(TMP_DIR);
  const cyclingJsonFiles = [];
  const walkingJsonFiles = [];
  const runningJsonFiles = [];
  const otherJsonFiles = [];

  rawJsonFiles.forEach((filename) => {
    const filePath = path.resolve(TMP_DIR, filename);

    if (filename.includes('voetgangers')) {
      walkingJsonFiles.push(filePath);
    } else if (filename.includes('hardloper')) {
      runningJsonFiles.push(filePath)
    } else if (filename.includes('fietser')) {
      cyclingJsonFiles.push(filePath);
    } else {
      otherJsonFiles.push(filePath);
    }
  });

  return {
    cycling: cyclingJsonFiles,
    running: runningJsonFiles,
    walking: walkingJsonFiles,
    other: otherJsonFiles,
  }

}

function chunkArray(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    result.push(arr.slice(i, i + CHUNK_SIZE));
  }
  return result;
}

async function recreateDir(path) {
  try {
    await fsp.rm(path, { recursive: true, force: true })
  } catch (e) { }
  await fsp.mkdir(path);
}
