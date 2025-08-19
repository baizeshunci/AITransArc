<template>
  <div id="building" class="flex flex-col min-h-screen">
    <!-- 标题容器（减小margin，避免顶部占用过多空间） -->
    <div class="z-10 text-white bg-opacity-50 bg-slate-800 m-1 rounded-md flex items-center justify-center title-container">
      <h1 class="text-4xl p-1 font-bold">变压器油中典型电弧放电过程</h1>
    </div>

    <!-- 内容容器（核心调整：自适应剩余空间，避免溢出） -->
    <div class="z-10 text-white flex-1 flex flex-wrap m-1 gap-2 content-container">
      <!-- 左侧内容（使用flex-1自适应，取消固定高度） -->
      <div class="flex-1 bg-opacity-50 bg-slate-800 p-2 rounded-md flex flex-col">
        <div class="flex-1 p-1 rounded-md text-center">
          <p>特高频信号频谱图(柱状图,0.3-3GHz 频段能量分布)</p>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>多传感器信号对比图(折线图，绕组上 / 中 / 下部信号幅值)</p>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>放电能量趋势图(折线图，时间 - 累积能量 J)</p>
        </div>
      </div>

      <!-- 中间内容（减小gap，避免高度累加溢出） -->
      <div class="flex-1 flex flex-col gap-2">
        <!-- 超声信号面板 -->
        <div class="bg-slate-800 bg-opacity-50 rounded-lg shadow-md overflow-hidden flex-1 flex flex-col">
          <div class="text-gray-300 text-sm font-medium p-2 border-b border-gray-700">
            超声信号监测区
          </div>
          <div class="flex-1 p-1">
            <UltrasonicChartSwitcher class="w-full h-full" />
          </div>
        </div>

        <!-- 脉冲电流面板 -->
        <div class="bg-slate-800 bg-opacity-50 rounded-lg shadow-md overflow-hidden flex-1 flex flex-col">
          <div class="text-gray-300 text-sm font-medium p-2 border-b border-gray-700">
            脉冲电流监测区
          </div>
          <div class="flex-1 p-1">
            <PulseCurrentMultiAnalysisChart class="w-full h-full" />
          </div>
        </div>
      </div>

      <!-- 右边内容（使用flex-1自适应高度，取消h-1/3固定比例） -->
      <div class="flex-1 bg-opacity-50 bg-slate-800 rounded-md flex flex-col">
        <!-- 温度图表：用flex-1自适应分配高度 -->
        <div class="flex-1 p-1 rounded-md text-center">
          <TemperatureChart :data="currentData.temperature" />
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <Stress_time :data="currentData.pressure"/>
        </div>
        <div class="flex-1 p-1 rounded-md text-center">
          <p>变压器 2D 模型图(带传感器位置标注,点击弹窗显示放电点)</p>
        </div>
      </div>
    </div>

    <!-- 类型选择容器（减小margin，避免底部溢出） -->
    <div class="z-10 text-white bg-opacity-50 bg-slate-800 m-1 rounded-md flex items-center justify-center type-container">
      <FaultType class="rounded-md w-full" :fault-types="faultTypes" :selected-type="currentSelected"
        @type-change="handleTypeChange" />
    </div>
  </div>
</template>

<script setup>
import TemperatureChart from "./components/temp_time.vue";
import FaultType from "./components/fault_type.vue";
import UltrasonicChartSwitcher from "./components/ultrasonic_chart_switcher.vue";
import PulseCurrentMultiAnalysisChart from "./components/pulse_current_multi_analysis_chart.vue";
import Stress_time from "./components/stress_time.vue";
import { ref } from 'vue';

// 故障类型列表
const faultTypes = [
  '正常状态',
  '电弧放电',
  '电晕放电',
  '火花放电',
  '内部故障',
  '未知类型'
];

// 完整模拟数据源（含电弧放电压力数据）
const mockDataSource = {
  '正常状态': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [18.5, 17.2, 16.8, 19.5, 23.2, 25.6, 24.8, 22.0, 20.5],
          color: '#4CAF50',
          smooth: true
        }
      ]
    },
    pressure: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.12, 0.11, 0.10, 0.12, 0.13, 0.14, 0.13, 0.12, 0.11],
          color: '#2196F3',
          smooth: true
        }
      ]
    }
  },
  '电弧放电': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [22.5, 24.2, 25.8, 27.5, 30.2, 32.6, 31.8, 29.0, 30.0],
          color: '#FF5722',
          smooth: true
        }
      ]
    },
    pressure: {
      // 电弧放电压力特征：12:00左右发生放电，压力骤升后逐渐回落
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.13, 0.14, 0.15, 0.16, 0.85, 0.52, 0.38, 0.25, 0.18],
          color: '#E91E63',
          smooth: false // 电弧放电压力突变，关闭平滑效果
        }
      ]
    }
  },
  '电晕放电': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [20.5, 21.2, 22.8, 23.5, 25.2, 26.6, 25.8, 24.0, 22.5],
          color: '#FFC107',
          smooth: true
        }
      ]
    },
    pressure: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.14, 0.15, 0.16, 0.17, 0.22, 0.25, 0.23, 0.20, 0.18],
          color: '#9C27B0',
          smooth: true
        }
      ]
    }
  },
  '火花放电': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [19.8, 20.5, 21.3, 22.7, 24.1, 25.3, 24.5, 23.2, 24.1],
          color: '#FF9800',
          smooth: true
        }
      ]
    },
    pressure: {
      // 火花放电压力特征：多次小幅脉冲
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.12, 0.13, 0.30, 0.15, 0.35, 0.18, 0.28, 0.16, 0.14],
          color: '#673AB7',
          smooth: false
        }
      ]
    }
  },
  '内部故障': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [23.1, 24.8, 26.5, 28.2, 30.5, 32.1, 31.3, 29.7, 29.9],
          color: '#F44336',
          smooth: true
        }
      ]
    },
    pressure: {
      // 内部故障压力特征：持续上升
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.15, 0.20, 0.28, 0.35, 0.42, 0.50, 0.58, 0.65, 0.72],
          color: '#795548',
          smooth: true
        }
      ]
    }
  },
  '未知类型': {
    temperature: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '环境温度',
          data: [17.6, 18.3, 19.1, 20.8, 22.5, 23.7, 22.9, 21.4, 17.6],
          color: '#9E9E9E',
          smooth: true
        }
      ]
    },
    pressure: {
      xAxis: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'],
      series: [
        {
          name: '油中压力',
          data: [0.13, 0.14, 0.16, 0.18, 0.25, 0.22, 0.19, 0.17, 0.15],
          color: '#607D8B',
          smooth: true
        }
      ]
    }
  }
};

// 响应式状态管理
const currentSelected = ref('正常状态');
const currentData = ref(mockDataSource[currentSelected.value]);

// 类型切换处理函数
function handleTypeChange(newType) {
  currentSelected.value = newType;
  currentData.value = mockDataSource[newType];
}
</script>

<style scoped>
#building {
  background: url("@/assets/bg.jpg") center/cover no-repeat fixed;
  height: 100vh;
  overflow: hidden; /* 保持页面级不滚动 */
}

.content-container {
  flex: 1;
  overflow: auto; /* 内容区超出时显示内部滚动条 */
  padding: 0.25rem;
  /* 限制最大高度为视口剩余空间（避免撑开屏幕） */
  max-height: calc(100vh - 60px - 40px); /* 减去标题栏和类型选择栏高度 */
}

/* 标题容器：限制最小高度，避免文字换行导致高度增加 */
.title-container {
  min-height: 60px;
  max-height: 80px;
  padding: 0.5rem 0; /* 垂直内边距减小 */
}


/* 类型选择容器：固定底部高度，避免挤压内容区 */
.type-container {
  padding: 0.25rem 0; /* 垂直内边距减小 */
}

/* 修复flex子元素高度计算偏差 */
.flex-1 {
  min-height: 0; /* 允许flex子元素高度小于内容高度时收缩 */
}
</style>