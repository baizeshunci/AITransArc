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
                value.xAxis.length > 0 &&  // 确保有数据点
                value.series.length > 0;
        }
    }
});

// 引用DOM元素
const target = ref(null);
const chartCard = ref(null);
// ECharts实例
let eChart = null;
// 避免重复初始化的标记
let isRendering = false;

// 计算父容器限制尺寸
const getParentConstrainedSize = (container) => {
    if (!container?.parentElement) return { width: 0, height: 0 };

    const parent = container.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // 限制最大尺寸为父容器的95%（预留边距）
    const maxWidth = parentRect.width * 0.95;
    const maxHeight = parentRect.height * 0.95;

    // 限制最小尺寸（增大最小高度避免底部文字溢出）
    const minWidth = Math.max(240, maxWidth * 0.4); // 增大最小宽度
    const minHeight = Math.max(180, maxHeight * 0.4); // 增大最小高度

    return {
        width: Math.min(container.clientWidth, maxWidth, Math.max(container.clientWidth, minWidth)),
        height: Math.min(container.clientHeight, maxHeight, Math.max(container.clientHeight, minHeight))
    };
};

// 动态计算网格边距（核心优化：增加底部边距防止文字溢出）
const getGridConfig = (size) => {
    // 根据容器尺寸动态调整底部边距
    const bottomMargin = size.height < 250 ? '22%' : // 小容器增加底部边距
        size.height < 350 ? '17%' : '12%';

    return {
        left: size.width < 300 ? '6%' : '3%',
        right: size.width < 300 ? '8%' : '4%',
        bottom: bottomMargin,  // 优化底部边距
        top: size.height < 200 ? '8%' : '4%',  // 适当增加顶部边距
        containLabel: true
    };
};

// 计算需要隐藏的标签索引
const getHiddenLabelIndexes = (dataLength, containerWidth) => {
    // 估算每个标签需要的最小宽度（像素）
    const labelMinWidth = 50;
    // 计算理论上能完整显示的最大标签数量
    const maxVisibleLabels = Math.floor(containerWidth / labelMinWidth);

    // 如果数据量超过可显示数量，需要隐藏中间部分
    if (dataLength > maxVisibleLabels && maxVisibleLabels >= 2) {
        const hiddenCount = dataLength - maxVisibleLabels;
        const startHideIndex = Math.floor((dataLength - hiddenCount) / 2);
        const endHideIndex = startHideIndex + hiddenCount;

        // 返回需要隐藏的标签索引数组
        return Array.from({ length: hiddenCount }, (_, i) => startHideIndex + i);
    }

    return []; // 无需隐藏
};

// 窗口大小变化时调整图表
const handleResize = () => {
    if (eChart) {
        eChart.resize();
    }
};

// 检查容器尺寸是否有效
const checkContainerSize = () => {
    if (!target.value) return false;
    const { clientWidth, clientHeight } = target.value;
    // 提高最小尺寸要求避免过小容器
    return clientWidth > 50 && clientHeight > 80;
};

// 渲染图表
const renderChart = async () => {
    // 防止重复渲染
    if (isRendering) return;
    isRendering = true;

    try {
        // 等待DOM更新并检查容器尺寸
        await nextTick();
        if (!checkContainerSize()) {
            // 尺寸无效时延迟重试
            let retryCount = 0;
            const retry = () => {
                if (retryCount >= 5) {
                    console.error("图表容器尺寸始终无效，无法初始化ECharts");
                    isRendering = false;
                    return;
                }
                setTimeout(async () => {
                    await nextTick();
                    if (checkContainerSize()) {
                        renderChart();
                    } else {
                        retryCount++;
                        retry();
                    }
                }, 100);
            };
            retry();
            return;
        }

        // 应用尺寸约束
        const constrained = getParentConstrainedSize(target.value);
        target.value.style.width = `${constrained.width}px`;
        target.value.style.height = `${constrained.height}px`;

        // 初始化或复用ECharts实例
        if (!eChart) {
            eChart = echarts.init(target.value);
        }

        // 设置图表配置
        const grid = getGridConfig(constrained);

        // 计算需要隐藏的标签索引
        const hiddenIndexes = getHiddenLabelIndexes(
            props.data.xAxis.length,
            constrained.width
        );

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
                    interval: 0,  // 强制显示所有标签位置
                    rotate: 0,    // 固定不旋转
                    margin: 8,    // 增加与轴线的距离
                    // 根据索引控制标签显示/隐藏
                    formatter: (value, index) => {
                        // 计算每个间隔的大小（根据容器宽度动态调整）
                        const intervalSize = Math.max(
                            1, // 最小间隔为1（全部显示）
                            Math.ceil(props.data.xAxis.length / (constrained.width / 60)) // 每60px显示一个标签
                        );

                        // 只显示间隔点和首尾标签
                        if (index % intervalSize !== 0 && index !== 0 && index !== props.data.xAxis.length - 1) {
                            return ''; // 隐藏非间隔点的标签
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
                    margin: 5  // 增加右侧边距
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    }
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
                    label: {
                        show: false,
                    },
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

        // 应用配置
        eChart.setOption(options, true);
    } catch (error) {
        console.error("图表渲染出错:", error);
    } finally {
        isRendering = false;
    }
};

// 组件挂载时初始化
onMounted(() => {
    renderChart();
    window.addEventListener('resize', handleResize);
});

// 监听父组件数据变化，实时更新图表
watch(() => props.data, () => {
    renderChart();
}, { deep: true });

// 组件卸载时清理
onUnmounted(() => {
    if (eChart) {
        eChart.dispose();
        eChart = null;
    }
    window.removeEventListener('resize', handleResize);
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
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
}
</style>