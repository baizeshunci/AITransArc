<template>
    <div class="chart-stack-container relative w-full h-full overflow-hidden">
        <!-- 温度趋势图容器 -->
        <div ref="chartCard"
            class="temperature-chart-card bg-card-dark rounded-lg border border-gray-700 shadow-lg transition-all duration-300 ease-out">
            <!-- 标题栏 -->
            <div class="chart-header px-[2%] pt-[1%] pb-[1%] flex items-center justify-between">
                <div class="chart-title text-gray-300 font-medium text-[clamp(0.7rem,2vw,0.8rem)]">温度趋势图</div>
                <div class="chart-unit text-gray-400 text-[clamp(0.6rem,1.5vw,0.7rem)]">
                    温度 / 时间
                </div>
            </div>
            <!-- 图表容器 -->
            <div ref="target" class="chart-container w-full h-[calc(100%-36px)] px-[0.5%] pb-[0.5%]"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";

// 接收父组件传入的数据
const props = defineProps({
    data: {
        type: Object,
        required: true,
        validator: (value) => {
            return value.xAxis && value.series &&
                Array.isArray(value.xAxis) &&
                Array.isArray(value.series) &&
                value.xAxis.length > 0 &&
                value.series.length > 0;
        }
    }
});

// 引用DOM容器
const target = ref(null);
let eChart = null;
let isRendering = false;
let resizeObserver = null;

// 记录上一次尺寸，避免重复弹窗
let lastWidth = 0;
let lastHeight = 0;

// 尺寸变化时调整图表并弹窗
const handleResize = () => {
    if (eChart && target.value) {
        // 获取实时尺寸
        const currentWidth = Math.round(target.value.offsetWidth);
        const currentHeight = Math.round(target.value.offsetHeight);
        
        // 尺寸变化时弹窗
        if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
            alert(`图表尺寸已变化：\n宽=${currentWidth}px, 高=${currentHeight}px`);
            lastWidth = currentWidth;
            lastHeight = currentHeight;
        }
        
        eChart.resize();
    }
};

// 根据实时尺寸计算网格配置（增加内部空白）
const getGridConfig = () => {
    if (!target.value) return {};
    
    const { offsetWidth: width, offsetHeight: height } = target.value;
    
    // 核心：增大网格边距（图表内容与边框的空白）
    const left = width < 300 ? '3%' : '2%'; // 左侧空白
    const right = width < 300 ? '6%' : '5%'; // 右侧空白
    const top = height < 200 ? '8%' : '5%'; // 顶部空白
    const bottom = height < 250 ? '25%' : height < 350 ? '20%' : '15%'; // 底部空白

    return {
        left,
        right,
        top,
        bottom,
        containLabel: true // 确保标签不被裁剪
    };
};

// 渲染图表（精简版）
const renderChart = async () => {
    if (isRendering || !target.value) return;
    isRendering = true;

    try {
        await nextTick();
        
        // 初始化或复用ECharts实例
        if (!eChart) {
            eChart = echarts.init(target.value);
        }

        // 基于实时尺寸设置图表配置
        const grid = getGridConfig();
        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                borderWidth: 1,
                textStyle: { color: '#e5e7eb' },
                formatter: (params) => {
                    return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}°C`;
                }
            },
            grid,
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: props.data.xAxis,
                axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
                axisLabel: {
                    color: 'rgba(209, 213, 219, 0.7)',
                    fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                    rotate: 0,
                    margin: 8,
                    formatter: (value, index) => {
                        const { offsetWidth: width } = target.value;
                        const intervalSize = Math.max(
                            1,
                            Math.ceil(props.data.xAxis.length / (width / 60))
                        );
                        if (index % intervalSize !== 0 && index !== 0 && index !== props.data.xAxis.length - 1) {
                            return '';
                        }
                        return value;
                    }
                },
                showMaxLabel: true,
                splitLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.1)' } }
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: 'rgba(209, 213, 219, 0.3)' } },
                axisLabel: {
                    formatter: '{value}°C',
                    color: 'rgba(209, 213, 219, 0.7)',
                    fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                    align: 'right',
                    margin: 5
                },
                splitLine: {
                    lineStyle: { color: 'rgba(200, 200, 200, 0.1)' }
                }
            },
            series: props.data.series.map((item) => ({
                name: item.name || '温度',
                type: 'line',
                smooth: item.smooth !== undefined ? item.smooth : true,
                symbol: 'circle',
                symbolSize: 6,
                showSymbol: false,
                emphasis: {
                    showSymbol: true,
                    symbolSize: 8
                },
                lineStyle: {
                    width: 2,
                    color: item.color || '#FF5722'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: `${item.color || '#FF5722'}33` },
                            { offset: 1, color: `${item.color || '#FF5722'}00` }
                        ]
                    }
                },
                data: item.data,
                markLine: {
                    silent: false,
                    tooltip: {
                        show: true,
                        trigger: 'item',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        textStyle: { color: '#fff' },
                        formatter: (params) => `${params.data.name}: ${params.data.yAxis || params.value.toFixed(1)}°C`
                    },
                    label: { show: false },
                    symbol: 'none',
                    lineStyle: { type: 'dashed', width: 1.5 },
                    data: [
                        { yAxis: 30, name: '高温阈值', lineStyle: { color: '#ff4d4f' } },
                        { yAxis: 10, name: '低温阈值', lineStyle: { color: '#1890ff' } },
                        { type: 'average', name: '平均温度', lineStyle: { color: '#52c41a' } }
                    ]
                }
            }))
        };

        eChart.setOption(options, true);
    } catch (error) {
        console.error("图表渲染出错:", error);
    } finally {
        isRendering = false;
    }
};

// 组件挂载时初始化监听
onMounted(() => {
    renderChart();
    if (target.value) {
        const observeElements = [target.value];
        if (target.value.parentElement) {
            observeElements.push(target.value.parentElement);
        }
        
        resizeObserver = new ResizeObserver(entries => {
            handleResize();
        });
        
        observeElements.forEach(el => {
            resizeObserver.observe(el, { box: 'border-box' });
        });
    }
});

// 监听数据变化
watch(() => props.data, () => {
    renderChart();
}, { deep: true });

// 组件卸载时清理
onUnmounted(() => {
    if (eChart) {
        eChart.dispose();
        eChart = null;
    }
    if (resizeObserver && target.value) {
        resizeObserver.unobserve(target.value);
        if (target.value.parentElement) {
            resizeObserver.unobserve(target.value.parentElement);
        }
        resizeObserver = null;
    }
});
</script>

<style lang="scss" scoped>
.chart-stack-container {
    background: transparent;
    border-radius: 0.5em;
    margin: 0;
    overflow: hidden;
}

.temperature-chart-card {
    width: 100%;
    height: 100%;
    position: relative;
    box-sizing: border-box;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border: 0.1em solid rgba(255, 87, 34, 0.3);
        border-radius: 0.4em;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s;
    }

    &:hover::before {
        opacity: 1;
    }
}

.chart-header {
    user-select: none;
    border-bottom: 1px solid rgba(200, 200, 200, 0.1);
    margin-bottom: 5px;
}

.bg-card-dark {
    background: #1f2937;
}

.shadow-lg {
    box-shadow: 0 0.2em 0.8em rgba(0, 0, 0, 0.2);
}

.chart-container {
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    overflow: hidden;
    box-sizing: border-box;
}
</style>