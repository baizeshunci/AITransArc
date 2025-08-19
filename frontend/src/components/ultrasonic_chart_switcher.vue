<template>
  <div class="paper-stack-container relative w-full h-full overflow-hidden">
    <!-- 时域波形图 -->
    <div 
      ref="timeDomainRef"
      :class="{ 'active': isTimeDomainActive, 'inactive': !isTimeDomainActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">时域波形图</div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          振幅 / 时间 (s)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
    </div>

    <!-- 频谱分析图 -->
    <div 
      ref="frequencyRef"
      :class="{ 'active': !isTimeDomainActive, 'inactive': isTimeDomainActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-blue-500/30 shadow-xl transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">频谱分析图</div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          能量 / 频率 (Hz)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import * as echarts from "echarts";

const isTimeDomainActive = ref(true);
const timeDomainRef = ref(null);
const frequencyRef = ref(null);
let timeChartInstance = null;
let frequencyChartInstance = null;
let isRendering = false;

// 计算父容器限制尺寸（确保不超过父容器）
const getParentConstrainedSize = (container) => {
  if (!container?.parentElement) return { width: 0, height: 0 };
  
  const parent = container.parentElement;
  const parentRect = parent.getBoundingClientRect();
  
  // 限制最大尺寸为父容器的95%（预留边距）
  const maxWidth = parentRect.width * 0.95;
  const maxHeight = parentRect.height * 0.95;
  
  // 限制最小尺寸（避免过小导致不可见）
  const minWidth = Math.max(180, maxWidth * 0.3); // 不小于父容器30%且至少180px
  const minHeight = Math.max(120, maxHeight * 0.3); // 不小于父容器30%且至少120px
  
  return {
    width: Math.min(container.clientWidth, maxWidth, Math.max(container.clientWidth, minWidth)),
    height: Math.min(container.clientHeight, maxHeight, Math.max(container.clientHeight, minHeight))
  };
};

const toggleStack = () => {
  if (timeChartInstance && isTimeDomainActive.value) timeChartInstance.clear();
  if (frequencyChartInstance && !isTimeDomainActive.value) frequencyChartInstance.clear();
  isTimeDomainActive.value = !isTimeDomainActive.value;
};

// 生成时域数据
const generateTimeDomainData = () => {
  const points = Math.floor(window.innerWidth / 2);
  const data = [];
  for (let i = 0; i < points; i++) {
    const x = i / points;
    const baseSin = Math.sin(x * 20 * Math.PI) * 0.4;
    const lowFreqSin = Math.sin(x * 4 * Math.PI) * 0.2;
    const noise = (Math.random() * 2 - 1) * 0.04;
    data.push([x, +(baseSin + lowFreqSin + noise).toFixed(4)]);
  }
  return data;
};

// 生成频谱数据
const generateFrequencyData = () => {
  const points = Math.floor(window.innerWidth / 5);
  const data = [];
  for (let i = 1; i < points; i++) {
    const freq = 20000 * Math.pow(i / points, 0.7);
    let amplitude = 0;
    if (freq < 200) amplitude = 0.8 + Math.random() * 0.15;
    else if (freq < 3000) amplitude = 1.0 + Math.random() * 0.25 - (freq - 200) / 30000;
    else amplitude = 0.5 * (1 - (freq - 3000) / 17000) + Math.random() * 0.15;
    data.push([+(freq).toFixed(0), +amplitude.toFixed(4)]);
  }
  return data;
};

// 动态计算网格边距（增加左侧边距，为Y轴标签预留空间）
const getGridConfig = (size) => {
  return {
    // 左侧边距增大，避免Y轴标签与内容重叠
    left: size.width < 300 ? '5%' : '3%',  // 小尺寸时左侧留更多空间
    right: size.width < 300 ? '8%' : '5%',
    bottom: size.height < 200 ? '20%' : '15%',
    top: size.height < 200 ? '10%' : '6%',
    containLabel: true
  };
};

// 初始化时域波形图
const initTimeDomainChart = () => {
  if (!timeDomainRef.value) return null;
  
  const container = timeDomainRef.value.querySelector('.chart-container');
  if (!container) return null;
  
  // 应用尺寸约束
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;
  
  if (timeChartInstance) timeChartInstance.dispose();
  timeChartInstance = echarts.init(container);
  
  const grid = getGridConfig(constrained);
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb' }
    },
    grid,
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize: 'clamp(0.55rem, 1.8vw, 0.65rem)',
        formatter: (value) => value.toFixed(2)
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize: 'clamp(0.55rem, 1.8vw, 0.65rem)',
        formatter: (value) => value.toFixed(2),
        align: 'right',
        // 增加标签与轴线的距离（关键修复）
        margin: constrained.width < 300 ? 6 : 4  // 小尺寸时边距更大
      },
      // 可选：添加轴线内边距，进一步分离轴线和标签
      axisTick: {
        inside: false,  // 刻度线向外，避免与标签冲突
        length: 0      // 缩短刻度线长度
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
    },
    series: [{
      name: '波形',
      type: 'line',
      data: generateTimeDomainData(),
      lineStyle: { 
        color: 'rgba(59, 130, 246, 1)',
        width: 1.5
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ]
        }
      },
      symbol: 'none',
      sampling: 'average',
      animation: { duration: 500 }
    }]
  };
  
  timeChartInstance.setOption(option);
  return timeChartInstance;
};

// 初始化频谱分析图
const initFrequencyChart = () => {
  if (!frequencyRef.value) return null;
  
  const container = frequencyRef.value.querySelector('.chart-container');
  if (!container) return null;
  
  // 应用尺寸约束
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;
  
  if (frequencyChartInstance) frequencyChartInstance.dispose();
  frequencyChartInstance = echarts.init(container);
  
  const grid = getGridConfig(constrained);
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb' }
    },
    grid,
    xAxis: {
      type: 'log',
      min: 20,
      max: 20000,
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize: 'clamp(0.55rem, 1.8vw, 0.65rem)',
        formatter: (value) => value >= 1000 ? (value/1000).toFixed(1) + 'k' : value.toFixed(0)
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize: 'clamp(0.55rem, 1.8vw, 0.65rem)',
        formatter: (value) => value.toFixed(2),
        align: 'right',
        // 增加标签与轴线的距离（关键修复）
        margin: constrained.width < 300 ? 6 : 4  // 小尺寸时边距更大
      },
      // 可选：添加轴线内边距，进一步分离轴线和标签
      axisTick: {
        inside: false,  // 刻度线向外，避免与标签冲突
        length: 0      // 缩短刻度线长度
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
    },
    series: [{
      name: '频谱',
      type: 'bar',
      data: generateFrequencyData(),
      barWidth: '70%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.85)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.45)' }
          ]
        }
      },
      animation: { duration: 500 }
    }]
  };
  
  frequencyChartInstance.setOption(option);
  return frequencyChartInstance;
};

// 渲染图表
const renderCharts = async () => {
  if (isRendering) return;
  isRendering = true;

  try {
    await nextTick();
    if (isTimeDomainActive.value && timeDomainRef.value) {
      const container = timeDomainRef.value.querySelector('.chart-container');
      if (container) {
        initTimeDomainChart();
        timeChartInstance?.resize();
      }
    } else if (frequencyRef.value) {
      const container = frequencyRef.value.querySelector('.chart-container');
      if (container) {
        initFrequencyChart();
        frequencyChartInstance?.resize();
      }
    }
  } catch (error) {
    console.error("图表渲染出错:", error);
  } finally {
    isRendering = false;
  }
};

// 窗口大小变化时调整
const handleResize = () => {
  // 先清除再重绘，确保尺寸正确
  if (timeChartInstance) timeChartInstance.dispose();
  if (frequencyChartInstance) frequencyChartInstance.dispose();
  setTimeout(renderCharts, 80);
};

watch(isTimeDomainActive, () => {
  setTimeout(renderCharts, 150);
});

onMounted(() => {
  window.addEventListener('resize', handleResize);
  const timer = setTimeout(() => {
    renderCharts();
    clearTimeout(timer);
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (timeChartInstance) timeChartInstance.dispose();
  if (frequencyChartInstance) frequencyChartInstance.dispose();
});
</script>

<style scoped>
.paper-stack-container {
  background: transparent;
  padding: 2%;
  border-radius: 0.5em;
  margin: 0;
  overflow: hidden;
}

.absolute {
  width: 100%;
  height: 100%;
  box-sizing: border-box; /* 确保边框不超出父容器 */
}

.active {
  top: 0;
  left: 0;
  z-index: 20;
  transform: translate(0, 0);
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.inactive {
  top: 0;
  left: 0;
  z-index: 10;
  transform: translate(2%, 2%);
  opacity: 0.45;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.active:hover::before,
.inactive::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 0.1em solid rgba(59, 130, 246, 0.5);
  border-radius: 0.4em;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s;
}

.active:hover::before { opacity: 1; }
.inactive::before { opacity: 0.7; }

.bg-card-dark { background: #1f2937; }
.shadow-lg { box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.2); }
.shadow-xl { box-shadow: 0 0.3em 1.2em rgba(0, 0, 0, 0.25); }

.chart-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
</style>