const { program } = require('commander');
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const superagent = require('superagent'); // Підключаємо superagent 

program
  .requiredOption('-h, --host <host>', 'Server address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <path>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch {
    await fs.mkdir(options.cache, { recursive: true });
  }
}

const getFilePath = (code) => path.join(options.cache, `${code}.jpg`);

const requestListener = async (req, res) => {
  const code = req.url.slice(1); // Отримуємо код, наприклад "200"
  const filePath = getFilePath(code);

  if (!code) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  try {
    if (req.method === 'GET') {
      try {
        // 1. Спочатку пробуємо знайти картинку в кеші (Частина 2) [cite: 48]
        const image = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
      } catch (err) {
        // 2. Якщо в кеші немає (помилка читання файлу), йдемо на http.cat (Частина 3)
        // Інструкція: "Додайте перевірку, яка буде надсилати запит... у випадку, коли кеш не має такої картинки" [cite: 59]
        
        try {
          // Робимо запит до зовнішнього API 
          // Інструкція: "передайте статусний код НТТР у шляху URL" [cite: 62]
          const response = await superagent.get(`https://http.cat/${code}`);
          
          const imageBuffer = response.body; // Отримуємо картинку як буфер

          // Інструкція: "збережіть картинку у кеш, так щоб наступного разу проксі-сервер брав картинку з кешу" [cite: 64]
          await fs.writeFile(filePath, imageBuffer);

          // Віддаємо картинку клієнту
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(imageBuffer);
        } catch (superagentError) {
          // Інструкція: "Якщо запит завершився помилкою... повернути відповідь з кодом 404" [cite: 63]
          res.writeHead(404);
          res.end('Not Found on http.cat');
        }
      }
    } 
    else if (req.method === 'PUT') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(filePath, buffer);
        res.writeHead(201);
        res.end('Created');
      });
    } 
    else if (req.method === 'DELETE') {
      try {
        await fs.unlink(filePath);
        res.writeHead(200);
        res.end('Deleted');
      } catch (err) {
        res.writeHead(404);
        res.end('Not Found');
      }
    } 
    else {
      res.writeHead(405);
      res.end('Method Not Allowed');
    }
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
};

const server = http.createServer(requestListener);

ensureCacheDir().then(() => {
  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}`);
  });
});