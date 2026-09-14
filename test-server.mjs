import http from 'http';
const server = http.createServer((req, res) => {
  res.end('Hello from background');
});
server.listen(43135, '127.0.0.1', () => {
  console.log('BG Server listening on 127.0.0.1:43135');
});
server.on('error', console.error);