<template>
  <div class="paper-stack-container relative w-full h-full overflow-hidden">
    <!-- 脉冲时间峰值柱状图 -->
    <div 
      ref="pulseTimeRef"
      :class="{ 'active': isPulseTimeActive, 'inactive': !isPulseTimeActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">脉冲时间峰值分布</div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          峰值电流 / 时间 (s)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]">
        <!-- 图例区域（整合到标题下方） -->
        <div class="legend-container flex items-center gap-3 px-[2%] pb-[1%]">
          <div v-for="(item, idx) in legendData" :key="idx" class="flex items-center gap-1.5">
            <span :style="{ backgroundColor: item.color, width: '5px', height: '5px', display: 'inline-block' }"></span>
            <span class="text-gray-400 text-[clamp(0.55rem,1.5vw,0.65rem)]">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 脉冲峰值频率分布图 -->
    <div 
      ref="pulseFreqRef"
      :class="{ 'active': !isPulseTimeActive, 'inactive': isPulseTimeActive }" 
      @click="toggleStack"
      class="absolute bg-card-dark rounded-lg border border-blue-500/30 shadow-xl transition-all duration-300 ease-out cursor-pointer"
    >
      <div class="px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">脉冲峰值区间频率</div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          出现次数 / 电流区间 (mA)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]">
        <!-- 图例区域 -->
        <div class="legend-container flex items-center gap-3 px-[2%] pb-[1%]">
          <div v-for="(item, idx) in legendData" :key="idx" class="flex items-center gap-1.5">
            <span :style="{ backgroundColor: item.color, width: '5px', height: '5px', display: 'inline-block' }"></span>
            <span class="text-gray-400 text-[clamp(0.55rem,1.5vw,0.65rem)]">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";

// 状态管理（与示例保持一致）
const isPulseTimeActive = ref(true);
const pulseTimeRef = ref(null);
const pulseFreqRef = ref(null);
let pulseTimeChart = null;
let pulseFreqChart = null;
let isRendering = false;

// 图例数据（精简为3类，保持视觉一致性）
const legendData = [
  { name: '低 (0-40mA)', color: '#3b82f6' },
  { name: '中 (40-80mA)', color: '#f59e0b' },
  { name: '高 (80-100mA)', color: '#ef4444' }
];

// 计算容器约束尺寸（参考示例的响应式逻辑）
const getParentConstrainedSize = (container) => {
  if (!container?.parentElement) return { width: 0, height: 0 };
  
  const parent = container.parentElement;
  const parentRect = parent.getBoundingClientRect();
  
  // 限制最大尺寸为父容器的95%，最小为180x120
  const maxWidth = parentRect.width * 0.95;
  const maxHeight = parentRect.height * 0.95;
  const minWidth = Math.max(180, maxWidth * 0.3);
  const minHeight = Math.max(120, maxHeight * 0.3);
  
  return {
    width: Math.min(container.clientWidth, maxWidth, Math.max(container.clientWidth, minWidth)),
    height: Math.min(container.clientHeight, maxHeight, Math.max(container.clientHeight, minHeight))
  };
};

// 切换图表（参考示例的切换逻辑）
const toggleStack = () => {
  if (pulseTimeChart && isPulseTimeActive.value) pulseTimeChart.clear();
  if (pulseFreqChart && !isPulseTimeActive.value) pulseFreqChart.clear();
  isPulseTimeActive.value = !isPulseTimeActive.value;
};

// 生成脉冲时间-峰值数据
const generatePulseTimeData = () => {
  const points = Math.floor(window.innerWidth / 3); // 随窗口宽度动态调整点数
  const data = [];
  for (let i = 0; i < points; i++) {
    const time = (i * 0.2).toFixed(1);
    const peakValue = Math.random() > 0.7 
      ? 50 + Math.random() * 50 
      : 10 + Math.random() * 40;
    data.push([parseFloat(time), parseFloat(peakValue.toFixed(1))]);
  }
  return data;
};

// 生成脉冲峰值区间频率数据（匹配3类图例）
const generatePulseFreqData = () => {
  const timeData = generatePulseTimeData();
  return [
    { name: '低 (0-40mA)', value: timeData.filter(([_, v]) => v < 40).length },
    { name: '中 (40-80mA)', value: timeData.filter(([_, v]) => v >= 40 && v < 80).length },
    { name: '高 (80-100mA)', value: timeData.filter(([_, v]) => v >= 80).length }
  ];
};

// 根据数值获取颜色（与图例对应）
const getColorByValue = (value) => {
  if (value < 40) return legendData[0].color;
  if (value < 80) return legendData[1].color;
  return legendData[2].color;
};

// 动态网格配置（参考示例的响应式网格）
const getGridConfig = (size) => ({
  left: size.width < 300 ? '7%' : '5%',
  right: size.width < 300 ? '7%' : '5%',
  bottom: size.height < 200 ? '18%' : '15%',
  top: size.height < 200 ? '25%' : '22%', // 预留图例空间
  containLabel: true
});

// 初始化脉冲时间-峰值柱状图
const initPulseTimeChart = () => {
  if (!pulseTimeRef.value) return null;
  
  const container = pulseTimeRef.value.querySelector('.chart-container');
  if (!container) return null;
  
  // 应用尺寸约束
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;
  
  if (pulseTimeChart) pulseTimeChart.dispose();
  pulseTimeChart = echarts.init(container);
  
  const pulseData = generatePulseTimeData();
  const grid = getGridConfig(constrained);
  const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
  
  // 处理数据着色
  const styledData = pulseData.map(([time, value]) => ({
    value: [time, value],
    itemStyle: { color: getColorByValue(value) }
  }));
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize }
    },
    grid,
    xAxis: {
      type: 'value',
      name: '时间 (s)',
      nameTextStyle: { color: 'rgba(209, 213, 219, 0.7)', fontSize },
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize,
        formatter: (val) => val.toFixed(1)
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: '峰值电流 (mA)',
      nameTextStyle: { color: 'rgba(209, 213, 219, 0.7)', fontSize },
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize,
        formatter: (val) => val.toFixed(0)
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } },
      min: 0,
      max: 100
    },
    series: [{
      name: '脉冲峰值',
      type: 'bar',
      data: styledData,
      barWidth: constrained.width < 300 ? '40%' : '50%',
      animation: { duration: 500 }
    }]
  };
  
  pulseTimeChart.setOption(option);
  return pulseTimeChart;
};

// 初始化脉冲峰值区间频率图
const initPulseFreqChart = () => {
  if (!pulseFreqRef.value) return null;
  
  const container = pulseFreqRef.value.querySelector('.chart-container');
  if (!container) return null;
  
  // 应用尺寸约束
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;
  
  if (pulseFreqChart) pulseFreqChart.dispose();
  pulseFreqChart = echarts.init(container);
  
  const freqData = generatePulseFreqData();
  const grid = getGridConfig(constrained);
  const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize }
    },
    grid,
    xAxis: {
      type: 'category',
      data: freqData.map(item => item.name),
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize,
        rotate: constrained.width < 280 ? 30 : 0
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '出现次数',
      nameTextStyle: { color: 'rgba(209, 213, 219, 0.7)', fontSize },
      axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
      axisLabel: { 
        color: 'rgba(209, 213, 219, 0.7)',
        fontSize
      },
      splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } },
      min: 0
    },
    series: [{
      name: '脉冲频率',
      type: 'bar',
      data: freqData.map(item => item.value),
      barWidth: constrained.width < 300 ? '40%' : '60%',
      itemStyle: {
        color: ({ dataIndex }) => legendData[dataIndex].color
      },
      animation: { duration: 500 }
    }]
  };
  
  pulseFreqChart.setOption(option);
  return pulseFreqChart;
};

// 渲染图表（参考示例的渲染逻辑）
const renderCharts = async () => {
  if (isRendering) return;
  isRendering = true;

  try {
    await nextTick();
    if (isPulseTimeActive.value) {
      if (pulseTimeRef.value) initPulseTimeChart();
    } else {
      if (pulseFreqRef.value) initPulseFreqChart();
    }
  } catch (error) {
    console.error("图表渲染出错:", error);
  } finally {
    isRendering = false;
  }
};

// 窗口大小变化处理（与示例保持一致）
const handleResize = () => {
  if (pulseTimeChart) pulseTimeChart.dispose();
  if (pulseFreqChart) pulseFreqChart.dispose();
  setTimeout(renderCharts, 80);
};

// 监听状态变化
watch(isPulseTimeActive, () => {
  setTimeout(renderCharts, 150);
});

// 生命周期管理
onMounted(() => {
  window.addEventListener('resize', handleResize);
  const timer = setTimeout(() => {
    renderCharts();
    clearTimeout(timer);
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (pulseTimeChart) pulseTimeChart.dispose();
  if (pulseFreqChart) pulseFreqChart.dispose();
});
</script>

<style scoped>
/* 保持与示例一致的样式风格 */
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
  box-sizing: border-box;
}

/* 激活/非激活状态样式（与示例统一） */
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

/* 边框hover效果（参考示例） */
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

/* 图例容器样式 */
.legend-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.3em;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

/* 优化图例滚动条 */
.legend-container::-webkit-scrollbar {
  height: 2px;
}

.legend-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 1px;
}
</style>