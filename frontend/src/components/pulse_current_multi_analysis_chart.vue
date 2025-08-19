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
      <div 
        ref="pulseTimeContainer" 
        class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"
      >
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
      <div 
        ref="pulseFreqContainer" 
        class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"
      >
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
import { ref, onMounted, onUnmounted, watch, nextTick, defineProps } from "vue";
import * as echarts from "echarts";
import { useBaseChart } from "./js/base-chart";

// 1. 定义接收的外部数据 props
const props = defineProps({
  // 脉冲时间-峰值数据：格式为 [[时间1, 峰值1], [时间2, 峰值2], ...]
  pulseTimeData: {
    type: Array,
    required: true,
    validator: (value) => {
      // 验证数据格式是否正确
      return value.every(item => 
        Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  },
  // 脉冲频率数据（可选，若不传入则自动根据 pulseTimeData 计算）
  pulseFreqData: {
    type: Array,
    default: null,
    validator: (value) => {
      if (!value) return true; // 允许为null
      // 验证格式：[{ name: '低', value: 次数 }, ...]
      return value.every(item => 
        typeof item === 'object' && item.name && typeof item.value === 'number'
      );
    }
  }
});

// 状态管理
const isPulseTimeActive = ref(true);
const pulseTimeRef = ref(null);
const pulseFreqRef = ref(null);
let pulseTimeChart = null;
let pulseFreqChart = null;
let resizeObserver = null;

// 图表容器ref
const pulseTimeContainer = ref(null);
const pulseFreqContainer = ref(null);

// 图例数据
const legendData = [
  { name: '低 (0-40mA)', color: '#3b82f6' },
  { name: '中 (40-80mA)', color: '#f59e0b' },
  { name: '高 (80-100mA)', color: '#ef4444' }
];

// 切换图表
const toggleStack = async () => {
  if (isPulseTimeActive.value && pulseTimeChart) {
    pulseTimeChart.dispose();
    pulseTimeChart = null;
  }
  if (!isPulseTimeActive.value && pulseFreqChart) {
    pulseFreqChart.dispose();
    pulseFreqChart = null;
  }
  
  isPulseTimeActive.value = !isPulseTimeActive.value;
  await nextTick();
  renderCharts();
};

// 2. 移除随机生成函数，改为使用 props 数据
// （原 generatePulseTimeData 和 generatePulseFreqData 已删除）

// 3. 根据传入的脉冲时间数据计算频率分布（如果未传入 pulseFreqData）
const calculateFreqData = () => {
  const timeData = props.pulseTimeData;
  return [
    { name: '低 (0-40mA)', value: timeData.filter(([_, v]) => v < 40).length },
    { name: '中 (40-80mA)', value: timeData.filter(([_, v]) => v >= 40 && v < 80).length },
    { name: '高 (80-100mA)', value: timeData.filter(([_, v]) => v >= 80).length }
  ];
};

// 根据数值获取颜色（保持不变）
const getColorByValue = (value) => {
  if (value < 40) return legendData[0].color;
  if (value < 80) return legendData[1].color;
  return legendData[2].color;
};

// 动态网格配置（保持不变）
const getGridConfig = (container) => {
  if (!container) return {
    left: '5%', right: '5%', bottom: '15%', top: '22%', containLabel: true
  };

  const { offsetWidth: width, offsetHeight: height } = container;
  return {
    left: width < 300 ? '7%' : '5%',
    right: width < 300 ? '7%' : '5%',
    bottom: height < 200 ? '18%' : '15%',
    top: height < 200 ? '10%' : '7%',
    containLabel: true
  };
};

// 初始化尺寸监听器（保持不变）
const initResizeListener = () => {
  if (resizeObserver) return;

  const observeTargets = [
    pulseTimeContainer.value,
    pulseFreqContainer.value
  ].filter(Boolean);

  resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === pulseTimeContainer.value && pulseTimeChart) {
        pulseTimeChart.resize();
      }
      if (entry.target === pulseFreqContainer.value && pulseFreqChart) {
        pulseFreqChart.resize();
      }
    });
  });

  observeTargets.forEach(target => {
    resizeObserver.observe(target, { box: 'border-box' });
  });
};

// 初始化脉冲时间-峰值柱状图（使用 props 数据）
const initPulseTimeChart = () => {
  if (!pulseTimeContainer.value) {
    console.warn("脉冲时间图容器未找到");
    return;
  }
  
  const container = pulseTimeContainer.value;

  if (pulseTimeChart) pulseTimeChart.dispose();
  
  try {
    pulseTimeChart = echarts.init(container);
  } catch (error) {
    console.error("脉冲时间图初始化失败：", error);
    pulseTimeChart = null;
    return;
  }

  const getPulseTimeOption = () => {
    const grid = getGridConfig(container);
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    // 使用外部传入的 pulseTimeData
    const styledData = props.pulseTimeData.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getColorByValue(value) }
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
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
        name: '',
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
        name: '',
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
        barWidth: container.offsetWidth < 300 ? '40%' : '50%',
        animation: { duration: 500 }
      }]
    };
  };

  pulseTimeChart.setOption(getPulseTimeOption());

  useBaseChart({
    target: pulseTimeContainer,
    getOption: getPulseTimeOption,
    watchSource: () => isPulseTimeActive.value
  });

  initResizeListener();
};

// 初始化脉冲峰值区间频率图（使用 props 数据或计算数据）
const initPulseFreqChart = () => {
  if (!pulseFreqContainer.value) {
    console.warn("脉冲频率图容器未找到");
    return;
  }
  
  const container = pulseFreqContainer.value;

  if (pulseFreqChart) {
    pulseFreqChart.dispose();
    pulseFreqChart = null;
  }

  try {
    pulseFreqChart = echarts.init(container);
  } catch (error) {
    console.error("脉冲频率图初始化失败：", error);
    pulseFreqChart = null;
    return;
  }

  const getPulseFreqOption = () => {
    const grid = getGridConfig(container);
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    // 使用外部传入的 pulseFreqData，若未传入则自动计算
    const freqData = props.pulseFreqData || calculateFreqData();

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
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
          rotate: container.offsetWidth < 280 ? 30 : 0
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '',
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
        name: '',
        type: 'bar',
        data: freqData.map(item => item.value),
        barWidth: container.offsetWidth < 300 ? '40%' : '60%',
        itemStyle: {
          color: ({ dataIndex }) => legendData[dataIndex].color
        },
        animation: { duration: 500 }
      }]
    };
  };

  pulseFreqChart.setOption(getPulseFreqOption());

  useBaseChart({
    target: pulseFreqContainer,
    getOption: getPulseFreqOption,
    watchSource: () => !isPulseTimeActive.value
  });

  initResizeListener();
};

// 渲染图表（新增监听 props 变化，数据更新时重新渲染）
const renderCharts = async () => {
  await nextTick();
  if (isPulseTimeActive.value) {
    initPulseTimeChart();
  } else {
    initPulseFreqChart();
  }
};

// 监听状态变化和 props 数据变化
watch(isPulseTimeActive, renderCharts, { immediate: true });
// 当外部传入的数据变化时，重新渲染图表
watch(() => [props.pulseTimeData, props.pulseFreqData], renderCharts, { deep: true });

// 生命周期管理（保持不变）
onMounted(() => {
  renderCharts();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (pulseTimeChart) pulseTimeChart.dispose();
  if (pulseFreqChart) pulseFreqChart.dispose();
});
</script>

<style scoped>
/* 样式保持不变 */
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
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden;
  box-sizing: border-box;
}

.legend-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.3em;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.legend-container::-webkit-scrollbar {
  height: 2px;
}

.legend-container::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 1px;
}
</style>