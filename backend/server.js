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

// ATENÇÃO: Altere 'COM6' para a porta onde o ESP32 está conectado
const port = new SerialPort({ path: 'COM6', baudRate: 921600 });

// Lê a serial linha por linha
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => {
  // Recebe "tempo,adc,forca", separa e envia via WebSocket
  const valores = data.split(',');
  
  if (valores.length === 3) {
    const tempo = parseInt(valores[0]);
    const adc = parseInt(valores[1]);
    const forca = parseFloat(valores[2]);

    io.emit('dados_forca', { tempo: tempo, adc: adc, forca: forca });
  }
});

server.listen(3000, () => {
  console.log('Backend rodando na porta 3000. Lendo Serial a 921600 bps...');
});