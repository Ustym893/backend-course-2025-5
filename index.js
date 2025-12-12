const { program } = require('commander');
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
// superagent підключимо в наступній частині

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

// Допоміжна функція для отримання шляху
const getFilePath = (code) => path.join(options.cache, `${code}.jpg`);

const requestListener = async (req, res) => {
  // Отримуємо код з URL, наприклад /200 -> 200 [cite: 696]
  const code = req.url.slice(1);
  const filePath = getFilePath(code);

  if (!code) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  try {
    if (req.method === 'GET') {
      // Читання з кешу [cite: 698]
      try {
        const image = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); // [cite: 704]
        res.end(image);
      } catch (err) {
        // Якщо файлу немає - 404 (в цій частині ще не йдемо на http.cat) [cite: 701]
        res.writeHead(404);
        res.end('Not Found in cache');
      }
    } 
    else if (req.method === 'PUT') {
      // Запис у кеш [cite: 699]
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(filePath, buffer);
        res.writeHead(201); // [cite: 703]
        res.end('Created');
      });
    } 
    else if (req.method === 'DELETE') {
      // Видалення з кешу [cite: 700]
      try {
        await fs.unlink(filePath);
        res.writeHead(200); // [cite: 703]
        res.end('Deleted');
      } catch (err) {
        res.writeHead(404);
        res.end('Not Found');
      }
    } 
    else {
      // Метод не підтримується [cite: 700]
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