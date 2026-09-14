const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort, ReadlineParser } = require('serialport');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Configura o WebSocket liberando o CORS para o frontend
const io = new Server(server, { cors: { origin: '*' } });

// ATENÇÃO: Altere 'COM3' para a porta onde o ESP32 está conectado
const port = new SerialPort({ path: 'COM6', baudRate: 921600 });

// Lê a serial linha por linha
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => {
  // Recebe "tempo_ms,sinal_bruto", separa e envia via WebSocket
  const [tempo, adc] = data.split(',');
  if (tempo && adc) {
    io.emit('dados_forca', { tempo: parseInt(tempo), adc: parseInt(adc) });
  }
});

server.listen(3000, () => {
  console.log('Backend rodando na porta 3000. Lendo Serial a 921600 bps...');
});