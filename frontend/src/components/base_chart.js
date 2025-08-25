// 图表基类（模板方法）
export class BaseChart {
  constructor(data) {
    this.data = data;
    this.chartInstance = null; // ECharts实例
    this.chartContainer = null; // 图表容器DOM
    this.loading = false; // 加载状态

    // 初始化流程（模板方法 - 固定流程）
    this.init();
  }

  // 模板方法：固定的初始化流程
  
  init() {
    // 先检查容器是否存在
    if (!this.chartContainer || !this.chartContainer.value) {
      console.warn('图表容器未就绪，将延迟初始化');
      // 延迟重试
      setTimeout(() => this.init(), 100);
      return;
    }
    this.mountChart();
    this.afterInit();
  }

  mountChart() {
    // 再次确认容器存在
    if (!this.chartContainer?.value) {
      throw new Error('图表容器不存在，无法挂载图表');
    }
    // 正常初始化逻辑...
    this.chartInstance = echarts.init(this.chartContainer.value);
    this.chartInstance.setOption(this.getChartOption());
  }

  // 核心方法：挂载图表（固定实现）
  mountChart() {
    if (!this.chartContainer.value) return;
    
    this.loading = true;
    import('echarts').then(echarts => {
      this.chartInstance = echarts.init(this.chartContainer.value);
      this.updateChart(); // 首次渲染
      this.loading = false;
    });
  }

  // 核心方法：更新图表（固定实现）
  updateChart() {
    if (!this.chartInstance || !this.data.value) return;
    
    try {
      const option = this.getChartOption(); // 调用抽象方法获取配置
      this.chartInstance.setOption(option);
      this.afterUpdate(); // 钩子：更新后
    } catch (error) {
      console.error('图表更新失败:', error);
    }
  }

  // 核心方法：监听数据变化（固定实现）
  watchDataChange() {
    if (!this.data) return;
    
    // 模拟Vue的watch效果（实际使用时应结合Vue的watch API）
    this.data.value = new Proxy(this.data.value, {
      set: (target, prop, value) => {
        target[prop] = value;
        this.beforeUpdate(); // 钩子：更新前
        this.updateChart();
        return true;
      }
    });
  }

  // 抽象方法：获取图表配置（必须由子类实现）
  getChartOption() {
    throw new Error('子类必须实现getChartOption方法');
  }

  // 抽象方法：获取图表标题（必须由子类实现）
  getChartTitle() {
    throw new Error('子类必须实现getChartTitle方法');
  }

  // 抽象方法：获取图表单位（必须由子类实现）
  getChartUnit() {
    throw new Error('子类必须实现getChartUnit方法');
  }

  // 钩子方法：初始化前（子类可重写）
  beforeInit() {}

  // 钩子方法：初始化后（子类可重写）
  afterInit() {}

  // 钩子方法：更新前（子类可重写）
  beforeUpdate() {}

  // 钩子方法：更新后（子类可重写）
  afterUpdate() {}

  // 通用方法：获取tooltip配置（子类可直接使用）
  getTooltipConfig() {
    return {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      textStyle: { color: '#fff' },
      borderWidth: 0
    };
  }

  // 通用方法：获取网格配置（子类可直接使用）
  getGridConfig() {
    return {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    };
  }

  // 销毁图表（固定实现）
  destroy() {
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  }
}
    