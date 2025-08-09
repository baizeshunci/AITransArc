<template>
    <div class="">
        <div>【压力趋势折线图】</div>
        <div ref="target" class="w-full h-full"></div>
    </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as echarts from "echarts";

// 只接收父组件传入的数据（核心）
const props = defineProps({
    data: {
        type: Object,
        required: true,
        // 数据格式校验（确保结构正确）
        validator: (value) => {
            return value.xAxis && value.series && Array.isArray(value.xAxis) && Array.isArray(value.series);
        }
    }
});

// 引用DOM容器
const target = ref(null);
// ECharts实例
let mChart = null;

// 窗口大小变化时调整图表
const handleResize = () => {
    if (mChart) {
        mChart.resize();
    }
};




</script>
<style lang="scss" scoped></style>
