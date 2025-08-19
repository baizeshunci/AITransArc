import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";

// 定义复用逻辑函数（接收组件的个性化配置）
export function useBaseChart(options) {
    // 从options中获取组件传递的参数
    const { target, getOption, watchSource } = options;

    // 内部状态（仅在复用逻辑中使用）
    let eChart = null; // ECharts实例
    let isRendering = false; // 避免重复渲染的标记
    let resizeObserver = null; // 尺寸监听实例

    // 处理尺寸变化
    const handleResize = () => {
        if (eChart && target.value) {
            eChart.resize(); // 调整图表尺寸
        }
    };

    // 渲染图表（核心方法）
    const renderChart = async () => {
        if (isRendering || !target.value) return;
        isRendering = true;

        try {
            await nextTick(); // 等待DOM更新

            // 初始化ECharts实例
            if (!eChart) {
                eChart = echarts.init(target.value);
            }

            // 调用组件提供的配置生成函数，获取个性化图表配置
            const option = getOption();
            eChart.setOption(option, true); // 应用配置
        } catch (error) {
            console.error("图表渲染失败:", error);
        } finally {
            isRendering = false;
        }
    };

    // 组件挂载时初始化
    onMounted(() => {
        renderChart(); // 首次渲染
        // 监听尺寸变化（图表容器和其父元素）
        if (target.value) {
            const observeElements = [target.value];
            if (target.value.parentElement) {
                observeElements.push(target.value.parentElement);
            }
            resizeObserver = new ResizeObserver(entries => handleResize());
            observeElements.forEach(el => resizeObserver.observe(el));
        }
    });

    // 监听数据变化（由组件指定监F听源）
    if (watchSource) {
        watch(watchSource, () => renderChart(), { deep: true });
    }

    // 组件卸载时清理
    onUnmounted(() => {
        if (eChart) eChart.dispose(); // 销毁实例
        if (resizeObserver && target.value) {
            resizeObserver.unobserve(target.value);
            if (target.value.parentElement) {
                resizeObserver.unobserve(target.value.parentElement);
            }
        }
    });

    // 暴露外部可能需要的方法（如手动刷新）
    return { renderChart };
}