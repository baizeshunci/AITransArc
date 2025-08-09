<template>
  <div class="text-center">
    <div class="flex w-full">
      <div class="w-[30%]">
        <span>故障类型筛选</span>
      </div>
      <div class="flex-1">
        <span>选中类型:{{ selectedType }} → 所有图表已同步展示该类型关联数据</span>
      </div>
    </div>

    <div class="flex w-full m-5">
      <button 
        v-for="type in faultTypes" 
        :key="type"
        :class="{ 'selected': selectedType === type, 'btn-base': true }"
        @click="handleTypeSelect(type)"
        class="flex-1"
      >
        {{ type }}
      </button>
    </div>

    <div class="flex w-full">
      <div class="flex-1">
        <span>模型当前预测:{{ selectedType }}({{ confidence }})</span> <!-- 动态显示选中类型的置信度 -->
      </div>
      <div class="flex-1">
        <span>最后更新:14:42</span>
      </div>
      <div class="flex-1">
        <span>特征匹配:与历史故障案例相似度89%</span>
      </div>
    </div>
  </div>
</template>

<script setup> 
import { ref , watch } from "vue"

// 接收父组件传递的props（故障类型列表和当前选中类型）
const props = defineProps({
  faultTypes: {
    type: Array,
    required: true // 必传：父组件的故障类型列表
  },
  selectedType: {
    type: String,
    required: true // 必传：父组件当前选中的类型
  }
});

// 定义要向父组件传递的事件
const emit = defineEmits(['type-change']);

// 置信度数据（可根据选中类型动态变化）
const confidence = ref('92%');

// 按钮点击事件：更新选中状态并通知父组件
function handleTypeSelect(type) {
  // 1. 只有类型变化时才触发通信（避免无效操作）
  if (type !== props.selectedType) {
    emit('type-change', type); // 向父组件传递新选中的类型
  }
}

watch(() => props.selectedType, (newType) => {
  updatePredictionInfo(newType);
});

// 根据选中类型更新预测信息（如置信度）
function updatePredictionInfo(type) {
  // 模拟不同类型的置信度
  const confidenceMap = {
    '正常状态': '95%',
    '电弧放电': '92%',
    '电晕放电': '88%',
    '火花放电': '90%',
    '内部故障': '85%',
    '未知类型': '60%'
  };
  confidence.value = confidenceMap[type] || '未知';
}
</script>

<style lang="scss" scoped>
.btn-base {
  flex: 1;
  padding: 8px 16px;
  margin: 0 4px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.1); /* 未选中时的背景 */
}

.selected {
  background-color: rgba(107, 109, 160, 0.5);
  color: white;
  font-weight: bold;
  transform: scale(1.05);
}
</style>