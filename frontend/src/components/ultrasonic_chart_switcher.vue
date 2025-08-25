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
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">时域波形图
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
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
        <div class="text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">频谱分析图
          <span class="ml-2 text-blue-400 text-[clamp(0.5rem,1vw,0.6rem)]">单击切换</span>
        </div>
        <div class="text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
          能量 / 频率 (Hz)
        </div>
      </div>
      <div class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
// 1. 引入复用的工具函数
import { 
  getGridConfig, 
  getAxisBaseConfig,
  getXAxisLabelFormatter,
  getYAxisLabelFormatter,
  getTooltipBaseConfig
} from "./utils_js/chart_utils";
// 2. 引入useBaseChart统一管理图表实例
import { useBaseChart } from "./utils_js/base-chart";

const props = defineProps({ 
  timeDomain: { // 保持原有逻辑不变
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(item => 
        Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  },
  // 重点修改：frequency 校验规则（匹配二维数值数组）
  frequency: {
    type: Array,
    default: null,
    validator: (value) => {
      if (!value) return true; // 允许为null
      // 修复：验证格式为「[[频率数字, 能量数字], ...]」（与父组件数据对齐）
      return value.every(item => 
        Array.isArray(item) && item.length === 2 && 
        typeof item[0] === 'number' && typeof item[1] === 'number'
      );
    }
  }
});

const isTimeDomainActive = ref(true);
const timeDomainRef = ref(null);
const frequencyRef = ref(null);

// 1. 新增实例缓存变量（setup 阶段定义，全局唯一，仅新增这2行）
const timeDomainChartIns = ref(null); // 缓存时域图实例
const frequencyChartIns = ref(null); // 缓存频谱图实例


// 计算父容器限制尺寸（保留原有逻辑）
const getParentConstrainedSize = (container) => {
  if (!container?.parentElement) return { width: 0, height: 0 };
  
  const parent = container.parentElement;
  const parentRect = parent.getBoundingClientRect();
  
  const maxWidth = parentRect.width * 0.95;
  const maxHeight = parentRect.height * 0.95;
  const minWidth = Math.max(180, maxWidth * 0.3);
  const minHeight = Math.max(120, maxHeight * 0.3);
  
  return {
    width: Math.min(container.clientWidth, maxWidth, Math.max(container.clientWidth, minWidth)),
    height: Math.min(container.clientHeight, maxHeight, Math.max(container.clientHeight, minHeight))
  };
};

// 切换图表（保留原有逻辑）
const toggleStack = () => {
  isTimeDomainActive.value = !isTimeDomainActive.value;
};

// 1. 脉冲峰值专用颜色函数
const getPulseColor = (value) => {
  if (value == null) return '#9ca3af';
  if (value <= 50) return '#3b82f6'; // 正常
  if (value <= 80) return '#f59e0b'; // 异常
  return '#ef4444'; // 故障
};

// 2. 时域振幅专用颜色函数（取绝对值）
const getAmplitudeColor = (value) => {
  if (value == null) return '#9ca3af';
  const absValue = Math.abs(value); // 振幅正负不影响强度，取绝对值判断
  if (absValue <= 0.5) return '#3b82f6'; // 正常
  if (absValue <= 1.0) return '#f59e0b'; // 异常
  return '#ef4444'; // 故障
};

const initTimeDomainChart = () => {
  // 1. 获取图表容器（基础安全校验：容器不存在则终止）
  const container = timeDomainRef.value?.querySelector('.chart-container');
  if (!container) return;

  // 2. 应用尺寸约束（保留原有逻辑，若后续觉得冗余可基于 useBaseChart 自动适配删除）
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;

  // 3. 图表配置生成函数（保留内部定义，因依赖当前作用域的 container/constrained）
  const getTimeDomainOption = () => {
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    const grid = getGridConfig(container, { type: 'time-domain' });
    
    const timeDomain = props.timeDomain.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getPulseColor(value) }
    }));
    
    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      tooltip: {
        ...getTooltipBaseConfig(),
        trigger: 'axis',
        textStyle: { ...getTooltipBaseConfig().textStyle, fontSize }
      },
      grid,
      xAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (value) => value.toFixed(2)
        }
      },
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (value) => value.toFixed(2),
          align: 'right',
          margin: constrained.width < 300 ? 6 : 4 // 依赖当前作用域的 constrained
        },
        axisTick: { inside: false, length: 0 }
      },
      series: [{
        name: '波形',
        type: 'line',
        data: timeDomain,
        lineStyle: { color: 'rgba(59, 130, 246, 1)', width: 1.5 },
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
  };

  // -------------------------- 关键修复开始 --------------------------
  // 4. 实例复用逻辑：先校验管理对象+内部实例的有效性
  if (!timeDomainChartIns.value) {
    // 首次创建：修复 target 参数（用 ref 包装 DOM，符合 useBaseChart 预期）
    timeDomainChartIns.value = useBaseChart({
      target: ref(container), // ✅ 原错误：{ value: container }，改为 ref(container)（Vue 标准 Ref 对象）
      getOption: getTimeDomainOption, // 内部函数可直接引用，依赖当前作用域
      watchSource: () => [isTimeDomainActive.value, props.timeDomain],
    });
  } else {
    // 后续复用：先获取内部 ECharts 实例，校验是否有效（核心修复 null 错误）
    const chartInstance = timeDomainChartIns.value.getChartInstance();
    
    if (!chartInstance) {
      // 实例已失效（null），重新初始化（兜底逻辑）
      timeDomainChartIns.value = useBaseChart({
        target: ref(container),
        getOption: getTimeDomainOption,
        watchSource: () => [isTimeDomainActive.value, props.timeDomain],
      });
      return timeDomainChartIns.value; // 重新初始化后直接返回
    }

    // 实例有效：安全更新配置和尺寸（加 try/catch 避免极端错误）
    try {
      chartInstance.setOption(getTimeDomainOption(), true);
      chartInstance.resize();
    } catch (error) {
      console.error("更新时域图失败，重新初始化：", error);
      // 更新失败时兜底重新初始化
      timeDomainChartIns.value = useBaseChart({
        target: ref(container),
        getOption: getTimeDomainOption,
        watchSource: () => [isTimeDomainActive.value, props.timeDomain],
      });
    }
  }
  // -------------------------- 关键修复结束 --------------------------

  return timeDomainChartIns.value;
};

// 4. 初始化频谱分析图（使用useBaseChart管理）
const initFrequencyChart = () => {
  // 获取图表容器
  const container = frequencyRef.value?.querySelector('.chart-container');
  if (!container) return;

  // 应用尺寸约束
  const constrained = getParentConstrainedSize(container);
  container.style.width = `${constrained.width}px`;
  container.style.height = `${constrained.height}px`;
  // 图表配置生成函数
  const getFrequencyOption = () => {
    const fontSize = `clamp(0.55rem, 1.8vw, 0.65rem)`;
    // 复用工具函数生成网格配置（指定类型）
    const grid = getGridConfig(container, { type: 'frequency' });
    
    const frequency = props.frequency.map(([time, value]) => ({
      value: [time, value],
      itemStyle: { color: getAmplitudeColor(value) }
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      // 复用提示框基础配置
      tooltip: {
        ...getTooltipBaseConfig(),
        trigger: 'axis',
        textStyle: { ...getTooltipBaseConfig().textStyle, fontSize }
      },
      grid,
      // 复用坐标轴基础配置（X轴）
      xAxis: {
        ...getAxisBaseConfig('log', { fontSize }),
        min: 20,
        max: 20000,
        axisLabel: {
          ...getAxisBaseConfig('log', { fontSize }).axisLabel,
          formatter: (value) => value >= 1000 ? (value/1000).toFixed(1) + 'k' : value.toFixed(0)
        }
      },
      // 复用坐标轴基础配置（Y轴）
      yAxis: {
        ...getAxisBaseConfig('value', { fontSize }),
        axisLabel: {
          ...getAxisBaseConfig('value', { fontSize }).axisLabel,
          formatter: (value) => value.toFixed(2),
          align: 'right',
          margin: constrained.width < 300 ? 6 : 4
        },
        axisTick: { inside: false, length: 0 }
      },
      series: [{
        name: '频谱',
        type: 'bar',
        data: frequency,
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
  };

  // 新增：缓存实例，避免重复创建（核心修改点）
  if (!frequencyChartIns.value) {
    // 首次创建：调用 useBaseChart 并缓存实例
    frequencyChartIns.value = useBaseChart({
      target: { value: container },
      getOption: getFrequencyOption,
      watchSource: () => [!isTimeDomainActive.value,props.frequency],
    });
  } else {
    // 后续复用：仅更新配置和尺寸
    frequencyChartIns.value.getChartInstance().setOption(getFrequencyOption(), true);
    frequencyChartIns.value.getChartInstance().resize();
  }

  return frequencyChartIns.value;
};

// 修改 renderCharts 函数（核心：判断实例是否存在，避免重复初始化）
const renderCharts = async () => {
  await nextTick(); // 确保DOM更新完成（切换图表后容器状态稳定）
  
  // 直接调用初始化函数，内部已处理“实例复用”逻辑
  if (isTimeDomainActive.value) {
    initTimeDomainChart(); // 内部会判断：实例存在则更新，不存在则创建
  } else {
    initFrequencyChart(); // 同上
  }
};

// 6. 优化监听逻辑（统一监听状态变化）
watch(
  () => isTimeDomainActive.value,
  () => renderCharts(),
  { immediate: true }
);

// 窗口大小变化处理（通过useBaseChart的resize能力）
const handleResize = () => {
  renderCharts();
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  renderCharts(); // 初始化渲染
});

onUnmounted(() => {
  // 原有逻辑：移除 resize 事件（不变）
  window.removeEventListener('resize', handleResize);
  
  // 新增：销毁缓存的图表实例（核心修改点）
  if (timeDomainChartIns.value) {
    timeDomainChartIns.value.destroyChart(); // 调用 useBaseChart 的销毁方法
    timeDomainChartIns.value = null; // 清空缓存
  }
  if (frequencyChartIns.value) {
    frequencyChartIns.value.destroyChart();
    frequencyChartIns.value = null;
  }
});
</script>

<style lang="scss" scoped>

@use "../styles/chart_keynote.scss" as *;

</style>