/**
 * 生成自适应的图表网格配置
 * @param {HTMLElement} container - 图表容器DOM元素
 * @param {Object} options - 配置选项
 * @param {string} options.type - 图表类型（temperature/pulse-time/pulse-freq）
 * @returns {Object} 网格配置
 */
export const getGridConfig = (container, options = {}) => {
  // 不同图表类型的网格配置规则（仅处理样式相关的边距计算）
  const typeConfig = {
    temperature: {
      left: (w) => w < 300 ? '3%' : '2%',
      right: (w) => w < 300 ? '6%' : '5%',
      top: (h) => h < 200 ? '8%' : '5%',
      bottom: (h) => h < 250 ? '25%' : h < 350 ? '20%' : '15%'
    },
    'pulse-time': {
      left: (w) => w < 300 ? '7%' : '5%',
      right: (w) => w < 300 ? '7%' : '5%',
      top: (h) => h < 200 ? '10%' : '7%',
      bottom: (h) => h < 200 ? '18%' : '15%'
    },
    'pulse-freq': {
      left: (w) => w < 300 ? '7%' : '5%',
      right: (w) => w < 300 ? '7%' : '5%',
      top: (h) => h < 200 ? '10%' : '7%',
      bottom: (h) => h < 200 ? '18%' : '15%'
    }
  };

  const config = typeConfig[options.type] || typeConfig.temperature;
  
  // 无容器时返回基础配置（确保不包含数据相关逻辑）
  if (!container) {
    return {
      left: '5%',
      right: '5%',
      top: '7%',
      bottom: '15%',
      containLabel: true
    };
  }

  const { offsetWidth: width, offsetHeight: height } = container;

  // 仅返回网格边距配置，不涉及任何数据相关属性
  return {
    left: config.left(width),
    right: config.right(width),
    top: config.top(height),
    bottom: config.bottom(height),
    containLabel: true
  };
};

/**
 * 生成坐标轴基础样式配置（仅处理样式，不干涉数据）
 * @param {string} axisType - 坐标轴类型（category/value）
 * @param {Object} options - 样式自定义选项
 * @returns {Object} 坐标轴样式配置
 */
export const getAxisBaseConfig = (axisType, options = {}) => {
  // 仅保留基础样式配置，移除可能影响数据的属性
  const baseStyles = {
    axisLine: {
      lineStyle: {
        color: options.axisLineColor || 'rgba(209, 213, 219, 0.3)'
      }
    },
    axisLabel: {
      color: options.labelColor || 'rgba(209, 213, 219, 0.7)',
      fontSize: options.fontSize || 'clamp(0.5rem, 1.5vw, 0.65rem)',
      // 不预设formatter，避免覆盖业务逻辑
      ...options.axisLabel
    },
    splitLine: {
      lineStyle: {
        color: options.splitLineColor || 'rgba(209, 213, 219, 0.1)'
      }
    },
    
  };

  // 仅返回样式相关配置，不包含data、min、max等数据属性
  return {
    type: axisType,
    ...baseStyles
  };
};

export const getTooltipBaseConfig = (options = {}) => {
  return {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    textStyle: { color: '#e5e7eb' },
    padding: [8, 12],
    
    // 解除限制，允许浮窗超出图表
    confine: false,
    appendToBody: true,
    zLevel: 9999,
    
    // 移除自定义position逻辑，使用ECharts默认定位
    // （默认会自动跟随鼠标，智能避开边界，与markLine的tooltip行为一致）
  };
};

export const getXAxisLabelFormatter = (options) => {
  const { intervalPixel = 45, target, data } = options;
  return (value, index) => {
    // 容器不存在或数据为空时，直接返回原值
    if (!target.value || !data.length) return value;

    const { offsetWidth: width } = target.value;
    // 根据容器宽度和间隔像素计算显示间隔
    const intervalSize = Math.max(
      1,
      Math.ceil(data.length / (width / intervalPixel))
    );
    // 只显示间隔位置、第一个和最后一个标签
    if (index % intervalSize !== 0 && index !== 0 && index !== data.length - 1) {
      return '';
    }
    return value;
  };
};

export const getYAxisLabelFormatter = (options) => {
  const { intervalPixel = 30, target, splitNumber = 5 } = options;
  return (value, index) => {
    // 容器不存在或未挂载时，显示所有标签
    if (!target.value || !target.value.offsetHeight) {
      return value;
    }

    // 强制显示第一个和最后一个标签（不受间隔影响）
    if (index === 0 || index === splitNumber - 1) {
      return value;
    }

    const { offsetHeight: height } = target.value;
    // 计算间隔（确保至少为1，避免除零错误）
    const intervalSize = Math.max(
      1,
      Math.ceil(splitNumber / (height / intervalPixel))
    );

    // 中间标签按间隔规则显示
    if (index % intervalSize !== 0) {
      return '';
    }
    
    return value;
  };
};