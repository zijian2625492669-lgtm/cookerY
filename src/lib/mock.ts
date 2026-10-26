import type { Recipe } from './types'

const now = Date.now()
export const ALL_TAGS = ['家常', '快手', '下饭', '汤', '早餐', '甜点', '素食']
export const MEMBERS = ['Zijian', 'TA']
const g = (name: string, amount = '', unit = '') => ({ name, amount, unit })

export const MOCK: Recipe[] = [
  {
    id: 'r1', title: '番茄炒蛋', emoji: '🍅', palette: 0, servings: 2, minutes: 15,
    description: '酸甜软嫩，拌饭一绝。番茄先炒出汁是关键。',
    tags: ['家常', '快手', '下饭'], author: 'Zijian', updatedAt: now - 1000,
    ingredients: [g('番茄', '2', '个'), g('鸡蛋', '3', '个'), g('小葱', '1', '根')],
    seasonings: [g('盐', '适量'), g('白糖', '1', '小勺'), g('食用油', '2', '勺')],
    sauce: [], sauceNote: '',
    prep: ['番茄顶部划十字，开水烫 30 秒去皮，切块。', '鸡蛋加一小撮盐打散。', '小葱切葱花。'],
    steps: ['热油大火炒蛋到七成熟，盛出。', '锅里留底油，下番茄中火翻炒，压出汁水。', '加糖和盐调味，倒回鸡蛋翻匀，撒葱花出锅。'],
  },
  {
    id: 'r2', title: '鱼香肉丝', emoji: '🥢', palette: 1, servings: 2, minutes: 30,
    description: '没有鱼的鱼香味，全靠那一碗汁。',
    tags: ['家常', '下饭'], author: 'TA', updatedAt: now - 2000,
    ingredients: [g('猪里脊', '250', 'g'), g('木耳', '1', '小把'), g('胡萝卜', '半', '根'), g('青椒', '1', '个')],
    seasonings: [g('郫县豆瓣', '1', '勺'), g('姜蒜末', '各1', '勺'), g('葱花', '少许'), g('食用油', '3', '勺')],
    sauce: [g('生抽', '2', '勺'), g('醋', '2', '勺'), g('白糖', '2', '勺'), g('淀粉', '1', '小勺'), g('清水', '3', '勺')],
    sauceNote: '全部放进小碗搅匀，糖和淀粉化开再用。',
    prep: ['里脊切丝，加少许盐、料酒、淀粉抓匀腌 10 分钟。', '木耳泡发切丝，胡萝卜、青椒切丝。', '调好鱼香汁备用。'],
    steps: ['热锅多放油，下肉丝滑炒到变白，盛出。', '留底油，小火炒香豆瓣酱和姜蒜末，炒出红油。', '下胡萝卜、木耳、青椒丝大火翻炒 1 分钟。', '倒回肉丝，淋入鱼香汁，大火翻匀收汁，撒葱花出锅。'],
  },
  {
    id: 'r3', title: '可乐鸡翅', emoji: '🍗', palette: 4, servings: 2, minutes: 35,
    description: '零失败的周末硬菜，收汁时多盯一眼。',
    tags: ['家常', '下饭'], author: 'TA', updatedAt: now - 3000,
    ingredients: [g('鸡翅中', '10', '个'), g('可乐', '330', 'ml')],
    seasonings: [g('生抽', '2', '勺'), g('老抽', '半', '勺'), g('姜片', '3', '片'), g('料酒', '1', '勺')],
    sauce: [], sauceNote: '',
    prep: ['鸡翅两面各划两刀。', '冷水下锅加姜片、料酒焯水，捞出擦干。'],
    steps: ['少油煎到两面金黄。', '倒入可乐、生抽、老抽，没过鸡翅，小火炖 15 分钟。', '开大火收汁，汁变浓稠挂在鸡翅上即可。'],
  },
  {
    id: 'r4', title: '葱油拌面', emoji: '🍜', palette: 3, servings: 1, minutes: 15,
    description: '一锅葱油能吃一星期。',
    tags: ['快手', '早餐'], author: 'Zijian', updatedAt: now - 4000,
    ingredients: [g('细面', '1', '把'), g('小葱', '1', '把')],
    seasonings: [g('食用油', '100', 'ml')],
    sauce: [g('生抽', '2', '勺'), g('老抽', '1', '勺'), g('白糖', '1', '勺')],
    sauceNote: '提前混合好，熬完葱油后直接倒进锅里。',
    prep: ['小葱切段，葱白葱绿分开，擦干水分。', '调好酱汁备用。'],
    steps: ['冷油下葱白，小火熬到微黄再下葱绿，熬到焦脆。', '倒入酱汁煮开，葱油就好了。', '面煮好捞出，浇两勺葱油拌匀。'],
  },
  {
    id: 'r5', title: '菌菇豆腐汤', emoji: '🍄', palette: 2, servings: 3, minutes: 20,
    description: '清淡暖胃，冰箱里有啥菌菇都能放。',
    tags: ['汤', '素食', '快手'], author: 'Zijian', updatedAt: now - 5000,
    ingredients: [g('嫩豆腐', '1', '盒'), g('杂菌', '200', 'g')],
    seasonings: [g('盐', '适量'), g('白胡椒', '少许')],
    sauce: [], sauceNote: '',
    prep: ['菌菇撕小朵，豆腐切块。'],
    steps: ['少油炒香菌菇，加开水煮 5 分钟。', '下豆腐再煮 3 分钟，加盐和白胡椒。'],
  },
]
