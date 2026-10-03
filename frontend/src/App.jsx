import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  
  // 1. Atualizado: O estado agora guarda a 'forca' também
  const [leituraAtual, setLeituraAtual] = useState({ tempo: 0, adc: 2481, forca: 0 });

  useEffect(() => {
    // Configuração visual do gráfico uPlot
    const opts = {
      title: "Sinal Bruto da Célula de Carga (Tempo Real)",
      width: containerRef.current.clientWidth - 40,
      height: 400,
      series: [
        {},
        {
          label: "ADC",
          stroke: "#38bdf8",
          fill: "rgba(56, 189, 248, 0.1)",
          width: 2,
        }
      ],
      axes: [
        { stroke: "#475569", grid: { stroke: "#334155" } },
        { stroke: "#475569", grid: { stroke: "#334155" } }
      ],
      scales: {
        // Mantém o eixo Y fixo baseado na calibração (0kg = ~2481)
        y: { auto: false, range: [2400, 3500] } 
      }
    };

    // Inicializa o gráfico vazio
    const uplot = new uPlot(opts, [[], []], containerRef.current);
    chartRef.current = uplot;

    // Buffers de memória na RAM
    let dadosX = [];
    let dadosY = [];
    let dadosForca = []; // Novo array para guardar o histórico da força
    const JANELA_PONTOS = 5000; // Mantém os últimos 5 segundos na tela (5000 pontos a 1000Hz)

    // RECEPÇÃO A 1000 HZ
    socket.on('dados_forca', (dados) => {
      dadosX.push(dados.tempo / 1000); 
      dadosY.push(dados.adc);
      dadosForca.push(dados.forca); // Pega a força exata enviada pelo ESP32/Node.js

      // Remove os pontos mais antigos para o gráfico deslizar
      if (dadosX.length > JANELA_PONTOS) {
        dadosX.shift();
        dadosY.shift();
        dadosForca.shift();
      }
    });

    // ATUALIZAÇÃO DA TELA A 30 FPS
    const renderTimer = setInterval(() => {
      if (dadosX.length > 0) {
        // Desenha o gráfico (usando apenas Tempo e ADC)
        uplot.setData([dadosX, dadosY]);
        
        // Atualiza os números nos cards da interface
        setLeituraAtual({
          tempo: dadosX[dadosX.length - 1],
          adc: dadosY[dadosY.length - 1],
          forca: dadosForca[dadosForca.length - 1]
        });
      }
    }, 33); 

    // Tratamento para redimensionamento da janela
    const resizeObserver = new ResizeObserver(() => {
      uplot.setSize({
        width: containerRef.current.clientWidth - 40,
        height: 400
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      socket.off('dados_forca');
      clearInterval(renderTimer);
      resizeObserver.disconnect();
      uplot.destroy();
    };
  }, []);

  // Pega a força calculada matematicamente pelo ESP32 e garante 2 casas decimais
  const forcaExibicao = Number(leituraAtual.forca).toFixed(2);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Sistema de Dinamometria e Aquisição EMG</h1>
      </header>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Sinal Bruto (ADC)</h3>
          <div className="value">{leituraAtual.adc}</div>
        </div>
        
        <div className="metric-card">
          <h3>Força Estimada</h3>
          <div className="value" style={{ color: '#4ade80' }}>
            {forcaExibicao} <span style={{ fontSize: '1.2rem' }}>kg</span>
          </div>
        </div>

        <div className="metric-card">
          <h3>Frequência</h3>
          <div className="value" style={{ color: '#a78bfa' }}>1000 <span style={{ fontSize: '1.2rem' }}>Hz</span></div>
        </div>
      </div>

      <div className="chart-container" ref={containerRef}>
        {/* O uPlot injetará o Canvas do gráfico aqui dentro */}
      </div>
    </div>
  );
}

export default App;
