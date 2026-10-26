import type { Recipe } from './types'

const now = Date.now()
export const ALL_TAGS = ['家常', '快手', '下饭', '汤', '早餐', '甜点', '素食']
export const MEMBERS = ['Zijian', 'TA']

export const MOCK: Recipe[] = [
  {
    id: 'r1', title: '番茄炒蛋', emoji: '🍅', palette: 0, servings: 2, minutes: 15,
    description: '酸甜软嫩，拌饭一绝。番茄先炒出汁是关键。',
    tags: ['家常', '快手', '下饭'], author: 'Zijian', updatedAt: now - 1000,
    ingredients: [
      { name: '番茄', amount: '2', unit: '个' },
      { name: '鸡蛋', amount: '3', unit: '个' },
      { name: '白糖', amount: '1', unit: '小勺' },
      { name: '盐', amount: '适量', unit: '' },
      { name: '葱花', amount: '少许', unit: '' },
    ],
    steps: [
      '番茄顶部划十字，开水烫 30 秒去皮，切块。',
      '鸡蛋加一小撮盐打散，热油大火炒到七成熟盛出。',
      '锅里留底油，下番茄中火翻炒，压出汁水。',
      '加糖和盐调味，倒回鸡蛋翻匀，撒葱花出锅。',
    ],
  },
  {
    id: 'r2', title: '可乐鸡翅', emoji: '🍗', palette: 1, servings: 2, minutes: 35,
    description: '零失败的周末硬菜，收汁时多盯一眼。',
    tags: ['家常', '下饭'], author: 'TA', updatedAt: now - 2000,
    ingredients: [
      { name: '鸡翅中', amount: '10', unit: '个' },
      { name: '可乐', amount: '330', unit: 'ml' },
      { name: '生抽', amount: '2', unit: '勺' },
      { name: '老抽', amount: '半', unit: '勺' },
      { name: '姜片', amount: '3', unit: '片' },
    ],
    steps: [
      '鸡翅两面划两刀，冷水下锅加姜片焯水，捞出擦干。',
      '少油煎到两面金黄。',
      '倒入可乐、生抽、老抽，没过鸡翅，小火炖 15 分钟。',
      '开大火收汁，汁变浓稠挂在鸡翅上即可。',
    ],
  },
  {
    id: 'r3', title: '菌菇豆腐汤', emoji: '🍄', palette: 2, servings: 3, minutes: 20,
    description: '清淡暖胃，冰箱里有啥菌菇都能放。',
    tags: ['汤', '素食', '快手'], author: 'Zijian', updatedAt: now - 3000,
    ingredients: [
      { name: '嫩豆腐', amount: '1', unit: '盒' },
      { name: '杂菌', amount: '200', unit: 'g' },
      { name: '白胡椒', amount: '少许', unit: '' },
    ],
    steps: ['菌菇撕小朵，豆腐切块。', '少油炒香菌菇，加开水煮 5 分钟。', '下豆腐再煮 3 分钟，加盐和白胡椒。'],
  },
  {
    id: 'r4', title: '葱油拌面', emoji: '🍜', palette: 3, servings: 1, minutes: 15,
    description: '一锅葱油能吃一星期。',
    tags: ['快手', '早餐'], author: 'TA', updatedAt: now - 4000,
    ingredients: [
      { name: '细面', amount: '1', unit: '把' },
      { name: '小葱', amount: '1', unit: '把' },
      { name: '生抽', amount: '2', unit: '勺' },
      { name: '老抽', amount: '1', unit: '勺' },
      { name: '白糖', amount: '1', unit: '勺' },
    ],
    steps: ['小葱切段，葱白葱绿分开。', '冷油下葱白，小火熬到微黄再下葱绿，熬到焦脆。', '加生抽、老抽、糖煮开，葱油就好了。', '面煮好捞出，浇两勺葱油拌匀。'],
  },
  {
    id: 'r5', title: '芒果西米露', emoji: '🥭', palette: 4, servings: 2, minutes: 30,
    description: '夏天的快乐。',
    tags: ['甜点'], author: 'TA', updatedAt: now - 5000,
    ingredients: [
      { name: '西米', amount: '50', unit: 'g' },
      { name: '芒果', amount: '2', unit: '个' },
      { name: '椰浆', amount: '200', unit: 'ml' },
    ],
    steps: ['西米煮到只剩小白点，关火焖 10 分钟，过凉水。', '芒果一半切丁，一半和椰浆打成泥。', '西米、芒果泥、芒果丁拼在一起，冷藏后更好喝。'],
  },
]
