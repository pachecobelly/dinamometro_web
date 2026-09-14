import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  
  // Estado leve apenas para os cards numéricos
  const [leituraAtual, setLeituraAtual] = useState({ tempo: 0, adc: 2400 });

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
        // Mantém o eixo Y fixo para o gráfico não ficar "pulando"
        y: { auto: false, range: [2000, 3500] } 
      }
    };

    // Inicializa o gráfico vazio
    const uplot = new uPlot(opts, [[], []], containerRef.current);
    chartRef.current = uplot;

    // Buffers de memória na RAM (não disparam renderização do React)
    let dadosX = [];
    let dadosY = [];
    const JANELA_PONTOS = 5000; // Mantém os últimos 5 segundos na tela (5000 pontos a 1000Hz)

    // 1. RECEPÇÃO A 1000 HZ: Apenas guarda os dados nos arrays
    socket.on('dados_forca', (dados) => {
      dadosX.push(dados.tempo / 1000); // Converte para segundos no eixo X
      dadosY.push(dados.adc);

      // Remove os pontos mais antigos para o gráfico deslizar
      if (dadosX.length > JANELA_PONTOS) {
        dadosX.shift();
        dadosY.shift();
      }
    });

    // 2. ATUALIZAÇÃO DA TELA A 30 FPS: Não trava o navegador
    const renderTimer = setInterval(() => {
      if (dadosX.length > 0) {
        // Joga o lote de dados para o WebGL desenhar
        uplot.setData([dadosX, dadosY]);
        
        // Atualiza os números nos cards da interface
        setLeituraAtual({
          tempo: dadosX[dadosX.length - 1],
          adc: dadosY[dadosY.length - 1]
        });
      }
    }, 33); // 33ms = ~30 quadros por segundo

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

  // Cálculo em tempo real da Força (Baseado no zero em 2400 e ganho de 20 pontos/kg)
  const forcaKg = Math.max(0, (leituraAtual.adc - 2400) / 20).toFixed(2);

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
            {forcaKg} <span style={{ fontSize: '1.2rem' }}>kg</span>
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