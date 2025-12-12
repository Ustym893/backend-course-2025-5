const { program } = require('commander');
const http = require('http');
const fs = require('fs/promises'); // Використовуємо проміси [cite: 695]
const path = require('path');

// Налаштування командного рядка [cite: 685-687]
program
  .requiredOption('-h, --host <host>', 'Server address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <path>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

// Перевірка та створення папки кешу [cite: 688]
async function ensureCacheDir() {
  try {
    await fs.access(options.cache);
  } catch {
    await fs.mkdir(options.cache, { recursive: true });
    console.log(`Created cache directory: ${options.cache}`);
  }
}

// Створення сервера [cite: 690]
const requestListener = async (req, res) => {
  res.writeHead(200);
  res.end('Server is working. Part 1 complete.');
};

const server = http.createServer(requestListener);

// Запуск сервера після перевірки папки
ensureCacheDir().then(() => {
  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}`);
    console.log(`Cache directory: ${options.cache}`);
  });
});