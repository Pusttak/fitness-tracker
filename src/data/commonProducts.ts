export interface CommonProduct {
  name: string
  category: string
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  piece_weight_g?: number
  serving_name?: string
}

export interface ProductCategory {
  id: string
  name: string
  icon: string
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'meat', name: 'Мясо и птица', icon: '🥩' },
  { id: 'fish', name: 'Рыба и морепродукты', icon: '🐟' },
  { id: 'dairy', name: 'Яйца и молочные', icon: '🥚' },
  { id: 'grains', name: 'Крупы и макароны', icon: '🌾' },
  { id: 'bread', name: 'Хлеб и выпечка', icon: '🍞' },
  { id: 'vegetables', name: 'Овощи', icon: '🥦' },
  { id: 'fruits', name: 'Фрукты и ягоды', icon: '🍎' },
  { id: 'legumes', name: 'Бобовые и орехи', icon: '🥜' },
  { id: 'oils', name: 'Масла и соусы', icon: '🫒' },
  { id: 'sweets', name: 'Сладкое и снеки', icon: '🍫' },
  { id: 'drinks', name: 'Напитки', icon: '🥤' },
  { id: 'prepared', name: 'Полуфабрикаты', icon: '🥫' },
]

export const COMMON_PRODUCTS: CommonProduct[] = [
  // Мясо и птица
  { name: 'Куриная грудка (без кожи, сырая)', category: 'meat', calories_per_100g: 113, protein_per_100g: 23.6, fat_per_100g: 1.9, carbs_per_100g: 0.4 },
  { name: 'Куриная грудка (варёная)', category: 'meat', calories_per_100g: 137, protein_per_100g: 29.8, fat_per_100g: 1.8, carbs_per_100g: 0.5 },
  { name: 'Куриное бедро (без кожи)', category: 'meat', calories_per_100g: 130, protein_per_100g: 19.7, fat_per_100g: 5.7, carbs_per_100g: 0 },
  { name: 'Куриные крылышки', category: 'meat', calories_per_100g: 186, protein_per_100g: 17.5, fat_per_100g: 12.5, carbs_per_100g: 0 },
  { name: 'Индейка (грудка)', category: 'meat', calories_per_100g: 104, protein_per_100g: 23.3, fat_per_100g: 1, carbs_per_100g: 0 },
  { name: 'Индейка (бедро)', category: 'meat', calories_per_100g: 150, protein_per_100g: 17.8, fat_per_100g: 8, carbs_per_100g: 0 },
  { name: 'Говядина (вырезка)', category: 'meat', calories_per_100g: 218, protein_per_100g: 18.6, fat_per_100g: 16, carbs_per_100g: 0 },
  { name: 'Говядина (варёная)', category: 'meat', calories_per_100g: 254, protein_per_100g: 25.8, fat_per_100g: 16.8, carbs_per_100g: 0 },
  { name: 'Говяжий фарш (15% жир)', category: 'meat', calories_per_100g: 215, protein_per_100g: 18.6, fat_per_100g: 15, carbs_per_100g: 0 },
  { name: 'Телятина', category: 'meat', calories_per_100g: 97, protein_per_100g: 19.7, fat_per_100g: 1.2, carbs_per_100g: 0 },
  { name: 'Свинина (нежирная)', category: 'meat', calories_per_100g: 160, protein_per_100g: 19.4, fat_per_100g: 7.1, carbs_per_100g: 0 },
  { name: 'Свинина (жирная)', category: 'meat', calories_per_100g: 489, protein_per_100g: 11.4, fat_per_100g: 49.3, carbs_per_100g: 0 },
  { name: 'Свиной фарш', category: 'meat', calories_per_100g: 263, protein_per_100g: 17, fat_per_100g: 21, carbs_per_100g: 0 },
  { name: 'Баранина', category: 'meat', calories_per_100g: 203, protein_per_100g: 16.3, fat_per_100g: 15.3, carbs_per_100g: 0 },
  { name: 'Печень куриная', category: 'meat', calories_per_100g: 140, protein_per_100g: 20.4, fat_per_100g: 5.9, carbs_per_100g: 0.7 },
  { name: 'Печень говяжья', category: 'meat', calories_per_100g: 127, protein_per_100g: 17.4, fat_per_100g: 3.1, carbs_per_100g: 0 },
  { name: 'Колбаса варёная (докторская)', category: 'meat', calories_per_100g: 257, protein_per_100g: 13.7, fat_per_100g: 22.8, carbs_per_100g: 0 },
  { name: 'Сосиски', category: 'meat', calories_per_100g: 266, protein_per_100g: 10.1, fat_per_100g: 23.9, carbs_per_100g: 1.7 },
  { name: 'Бекон', category: 'meat', calories_per_100g: 500, protein_per_100g: 13, fat_per_100g: 45, carbs_per_100g: 0 },
  { name: 'Ветчина', category: 'meat', calories_per_100g: 279, protein_per_100g: 22.6, fat_per_100g: 20.9, carbs_per_100g: 0 },

  // Рыба и морепродукты
  { name: 'Лосось (сёмга)', category: 'fish', calories_per_100g: 208, protein_per_100g: 20, fat_per_100g: 13.6, carbs_per_100g: 0 },
  { name: 'Форель', category: 'fish', calories_per_100g: 97, protein_per_100g: 19.9, fat_per_100g: 2.1, carbs_per_100g: 0 },
  { name: 'Треска', category: 'fish', calories_per_100g: 78, protein_per_100g: 17.7, fat_per_100g: 0.7, carbs_per_100g: 0 },
  { name: 'Тунец (консервы в собственном соку)', category: 'fish', calories_per_100g: 96, protein_per_100g: 21.7, fat_per_100g: 0.7, carbs_per_100g: 0 },
  { name: 'Тунец свежий', category: 'fish', calories_per_100g: 139, protein_per_100g: 23.3, fat_per_100g: 4.9, carbs_per_100g: 0 },
  { name: 'Минтай', category: 'fish', calories_per_100g: 72, protein_per_100g: 15.9, fat_per_100g: 0.9, carbs_per_100g: 0 },
  { name: 'Хек', category: 'fish', calories_per_100g: 86, protein_per_100g: 16.6, fat_per_100g: 2.2, carbs_per_100g: 0 },
  { name: 'Судак', category: 'fish', calories_per_100g: 84, protein_per_100g: 18.4, fat_per_100g: 1.1, carbs_per_100g: 0 },
  { name: 'Сельдь', category: 'fish', calories_per_100g: 246, protein_per_100g: 17.7, fat_per_100g: 19.5, carbs_per_100g: 0 },
  { name: 'Скумбрия', category: 'fish', calories_per_100g: 191, protein_per_100g: 18, fat_per_100g: 13.2, carbs_per_100g: 0 },
  { name: 'Горбуша', category: 'fish', calories_per_100g: 142, protein_per_100g: 20.5, fat_per_100g: 6.5, carbs_per_100g: 0 },
  { name: 'Креветки', category: 'fish', calories_per_100g: 95, protein_per_100g: 20, fat_per_100g: 1.7, carbs_per_100g: 0 },
  { name: 'Кальмары', category: 'fish', calories_per_100g: 92, protein_per_100g: 18, fat_per_100g: 0.9, carbs_per_100g: 2 },
  { name: 'Мидии', category: 'fish', calories_per_100g: 77, protein_per_100g: 11.5, fat_per_100g: 2, carbs_per_100g: 3.3 },
  { name: 'Крабовые палочки', category: 'fish', calories_per_100g: 94, protein_per_100g: 6.5, fat_per_100g: 1, carbs_per_100g: 16.7 },

  // Яйца и молочные
  { name: 'Яйцо куриное', category: 'dairy', calories_per_100g: 155, protein_per_100g: 12.6, fat_per_100g: 10.6, carbs_per_100g: 1.1, piece_weight_g: 60, serving_name: 'шт' },
  { name: 'Яичный белок', category: 'dairy', calories_per_100g: 44, protein_per_100g: 11.1, fat_per_100g: 0.2, carbs_per_100g: 0.7 },
  { name: 'Яичный желток', category: 'dairy', calories_per_100g: 322, protein_per_100g: 16.2, fat_per_100g: 27.2, carbs_per_100g: 1 },
  { name: 'Творог 0%', category: 'dairy', calories_per_100g: 71, protein_per_100g: 18, fat_per_100g: 0.6, carbs_per_100g: 1.8 },
  { name: 'Творог 5%', category: 'dairy', calories_per_100g: 121, protein_per_100g: 17.2, fat_per_100g: 5, carbs_per_100g: 1.8 },
  { name: 'Творог 9%', category: 'dairy', calories_per_100g: 159, protein_per_100g: 16.7, fat_per_100g: 9, carbs_per_100g: 2 },
  { name: 'Молоко 2.5%', category: 'dairy', calories_per_100g: 52, protein_per_100g: 2.8, fat_per_100g: 2.5, carbs_per_100g: 4.7 },
  { name: 'Молоко 3.2%', category: 'dairy', calories_per_100g: 59, protein_per_100g: 2.9, fat_per_100g: 3.2, carbs_per_100g: 4.7 },
  { name: 'Молоко 1%', category: 'dairy', calories_per_100g: 42, protein_per_100g: 3, fat_per_100g: 1, carbs_per_100g: 4.8 },
  { name: 'Кефир 1%', category: 'dairy', calories_per_100g: 40, protein_per_100g: 3, fat_per_100g: 1, carbs_per_100g: 4 },
  { name: 'Кефир 2.5%', category: 'dairy', calories_per_100g: 53, protein_per_100g: 2.9, fat_per_100g: 2.5, carbs_per_100g: 4 },
  { name: 'Ряженка', category: 'dairy', calories_per_100g: 54, protein_per_100g: 2.8, fat_per_100g: 2.5, carbs_per_100g: 4.2 },
  { name: 'Сыр Российский', category: 'dairy', calories_per_100g: 363, protein_per_100g: 24.1, fat_per_100g: 29.5, carbs_per_100g: 0.3 },
  { name: 'Сыр Моцарелла', category: 'dairy', calories_per_100g: 240, protein_per_100g: 18, fat_per_100g: 18.5, carbs_per_100g: 0.7 },
  { name: 'Сыр Пармезан', category: 'dairy', calories_per_100g: 392, protein_per_100g: 33, fat_per_100g: 28, carbs_per_100g: 0 },
  { name: 'Сыр плавленый', category: 'dairy', calories_per_100g: 257, protein_per_100g: 9, fat_per_100g: 19, carbs_per_100g: 6 },
  { name: 'Сыр творожный (Филадельфия)', category: 'dairy', calories_per_100g: 253, protein_per_100g: 6, fat_per_100g: 24, carbs_per_100g: 3 },
  { name: 'Сметана 15%', category: 'dairy', calories_per_100g: 158, protein_per_100g: 2.6, fat_per_100g: 15, carbs_per_100g: 3 },
  { name: 'Сметана 20%', category: 'dairy', calories_per_100g: 206, protein_per_100g: 2.8, fat_per_100g: 20, carbs_per_100g: 3.2 },
  { name: 'Йогурт натуральный 2%', category: 'dairy', calories_per_100g: 60, protein_per_100g: 4.3, fat_per_100g: 2, carbs_per_100g: 6.2 },
  { name: 'Йогурт греческий', category: 'dairy', calories_per_100g: 66, protein_per_100g: 10, fat_per_100g: 0.4, carbs_per_100g: 3.6 },
  { name: 'Масло сливочное 82.5%', category: 'dairy', calories_per_100g: 748, protein_per_100g: 0.5, fat_per_100g: 82.5, carbs_per_100g: 0.8 },
  { name: 'Сливки 10%', category: 'dairy', calories_per_100g: 118, protein_per_100g: 3, fat_per_100g: 10, carbs_per_100g: 4 },
  { name: 'Сливки 20%', category: 'dairy', calories_per_100g: 205, protein_per_100g: 2.8, fat_per_100g: 20, carbs_per_100g: 3.7 },

  // Крупы и макароны (сухие)
  { name: 'Рис белый', category: 'grains', calories_per_100g: 344, protein_per_100g: 6.7, fat_per_100g: 0.7, carbs_per_100g: 78.9 },
  { name: 'Рис бурый', category: 'grains', calories_per_100g: 337, protein_per_100g: 7.4, fat_per_100g: 1.8, carbs_per_100g: 72.8 },
  { name: 'Гречка', category: 'grains', calories_per_100g: 313, protein_per_100g: 12.6, fat_per_100g: 3.3, carbs_per_100g: 62.1 },
  { name: 'Овсянка (хлопья)', category: 'grains', calories_per_100g: 352, protein_per_100g: 12.3, fat_per_100g: 6.1, carbs_per_100g: 61.8 },
  { name: 'Манная крупа', category: 'grains', calories_per_100g: 333, protein_per_100g: 10.3, fat_per_100g: 1, carbs_per_100g: 70.6 },
  { name: 'Макароны', category: 'grains', calories_per_100g: 344, protein_per_100g: 10.4, fat_per_100g: 1.1, carbs_per_100g: 71.5 },
  { name: 'Пшено', category: 'grains', calories_per_100g: 342, protein_per_100g: 11.5, fat_per_100g: 3.3, carbs_per_100g: 66.5 },
  { name: 'Перловка', category: 'grains', calories_per_100g: 315, protein_per_100g: 9.3, fat_per_100g: 1.1, carbs_per_100g: 66.9 },
  { name: 'Булгур', category: 'grains', calories_per_100g: 342, protein_per_100g: 12.3, fat_per_100g: 1.3, carbs_per_100g: 63.4 },
  { name: 'Кускус', category: 'grains', calories_per_100g: 376, protein_per_100g: 12.8, fat_per_100g: 0.6, carbs_per_100g: 72.4 },
  { name: 'Киноа', category: 'grains', calories_per_100g: 368, protein_per_100g: 14.1, fat_per_100g: 6.1, carbs_per_100g: 57.2 },
  { name: 'Ячневая крупа', category: 'grains', calories_per_100g: 313, protein_per_100g: 10, fat_per_100g: 1.3, carbs_per_100g: 66.3 },
  { name: 'Кукурузная крупа', category: 'grains', calories_per_100g: 337, protein_per_100g: 8.3, fat_per_100g: 1.2, carbs_per_100g: 75 },
  { name: 'Мука пшеничная', category: 'grains', calories_per_100g: 334, protein_per_100g: 10.3, fat_per_100g: 1.1, carbs_per_100g: 70.6 },

  // Хлеб и выпечка
  { name: 'Хлеб белый', category: 'bread', calories_per_100g: 265, protein_per_100g: 7.6, fat_per_100g: 3.3, carbs_per_100g: 48.5, piece_weight_g: 30, serving_name: 'ломтик' },
  { name: 'Хлеб чёрный (ржаной)', category: 'bread', calories_per_100g: 174, protein_per_100g: 6.6, fat_per_100g: 1.2, carbs_per_100g: 33.4, piece_weight_g: 30, serving_name: 'ломтик' },
  { name: 'Хлеб цельнозерновой', category: 'bread', calories_per_100g: 247, protein_per_100g: 13, fat_per_100g: 3.4, carbs_per_100g: 41, piece_weight_g: 35, serving_name: 'ломтик' },
  { name: 'Лаваш тонкий', category: 'bread', calories_per_100g: 275, protein_per_100g: 9.1, fat_per_100g: 1.1, carbs_per_100g: 56.8, piece_weight_g: 80, serving_name: 'шт' },
  { name: 'Лепёшка', category: 'bread', calories_per_100g: 262, protein_per_100g: 7.9, fat_per_100g: 3.7, carbs_per_100g: 47.6 },
  { name: 'Батон', category: 'bread', calories_per_100g: 262, protein_per_100g: 7.5, fat_per_100g: 2.9, carbs_per_100g: 50.9, piece_weight_g: 30, serving_name: 'ломтик' },
  { name: 'Багет', category: 'bread', calories_per_100g: 262, protein_per_100g: 8, fat_per_100g: 1.5, carbs_per_100g: 52, piece_weight_g: 30, serving_name: 'ломтик' },
  { name: 'Хлебцы цельнозерновые', category: 'bread', calories_per_100g: 310, protein_per_100g: 12, fat_per_100g: 2.5, carbs_per_100g: 60, piece_weight_g: 10, serving_name: 'шт' },

  // Овощи
  { name: 'Помидор', category: 'vegetables', calories_per_100g: 18, protein_per_100g: 0.9, fat_per_100g: 0.2, carbs_per_100g: 3.9 },
  { name: 'Огурец', category: 'vegetables', calories_per_100g: 15, protein_per_100g: 0.8, fat_per_100g: 0.1, carbs_per_100g: 2.8 },
  { name: 'Картофель (сырой)', category: 'vegetables', calories_per_100g: 77, protein_per_100g: 2, fat_per_100g: 0.4, carbs_per_100g: 17 },
  { name: 'Лук репчатый', category: 'vegetables', calories_per_100g: 40, protein_per_100g: 1.1, fat_per_100g: 0.1, carbs_per_100g: 9.3 },
  { name: 'Морковь', category: 'vegetables', calories_per_100g: 41, protein_per_100g: 0.9, fat_per_100g: 0.2, carbs_per_100g: 9.6 },
  { name: 'Капуста белокочанная', category: 'vegetables', calories_per_100g: 27, protein_per_100g: 1.8, fat_per_100g: 0.1, carbs_per_100g: 4.7 },
  { name: 'Капуста цветная', category: 'vegetables', calories_per_100g: 25, protein_per_100g: 2.5, fat_per_100g: 0.3, carbs_per_100g: 4.2 },
  { name: 'Капуста пекинская', category: 'vegetables', calories_per_100g: 16, protein_per_100g: 1.2, fat_per_100g: 0.2, carbs_per_100g: 2.2 },
  { name: 'Перец болгарский', category: 'vegetables', calories_per_100g: 27, protein_per_100g: 1.3, fat_per_100g: 0, carbs_per_100g: 5.3 },
  { name: 'Брокколи', category: 'vegetables', calories_per_100g: 34, protein_per_100g: 2.8, fat_per_100g: 0.4, carbs_per_100g: 7 },
  { name: 'Шпинат', category: 'vegetables', calories_per_100g: 23, protein_per_100g: 2.9, fat_per_100g: 0.4, carbs_per_100g: 3.6 },
  { name: 'Кабачок', category: 'vegetables', calories_per_100g: 24, protein_per_100g: 0.6, fat_per_100g: 0.3, carbs_per_100g: 4.6 },
  { name: 'Баклажан', category: 'vegetables', calories_per_100g: 25, protein_per_100g: 1.2, fat_per_100g: 0.1, carbs_per_100g: 4.5 },
  { name: 'Чеснок', category: 'vegetables', calories_per_100g: 149, protein_per_100g: 6.5, fat_per_100g: 0.5, carbs_per_100g: 29.9 },
  { name: 'Свёкла', category: 'vegetables', calories_per_100g: 43, protein_per_100g: 1.5, fat_per_100g: 0.1, carbs_per_100g: 8.8 },
  { name: 'Авокадо', category: 'vegetables', calories_per_100g: 160, protein_per_100g: 2, fat_per_100g: 14.7, carbs_per_100g: 8.5 },
  { name: 'Редис', category: 'vegetables', calories_per_100g: 20, protein_per_100g: 1.2, fat_per_100g: 0.1, carbs_per_100g: 3.4 },
  { name: 'Тыква', category: 'vegetables', calories_per_100g: 22, protein_per_100g: 1, fat_per_100g: 0.1, carbs_per_100g: 4.4 },
  { name: 'Сельдерей (стебель)', category: 'vegetables', calories_per_100g: 16, protein_per_100g: 0.9, fat_per_100g: 0.1, carbs_per_100g: 2.1 },
  { name: 'Кукуруза (варёная)', category: 'vegetables', calories_per_100g: 96, protein_per_100g: 3.4, fat_per_100g: 1.5, carbs_per_100g: 22.5 },
  { name: 'Спаржа', category: 'vegetables', calories_per_100g: 20, protein_per_100g: 2.2, fat_per_100g: 0.1, carbs_per_100g: 3.1 },
  { name: 'Зелёный горошек', category: 'vegetables', calories_per_100g: 73, protein_per_100g: 5, fat_per_100g: 0.2, carbs_per_100g: 13.3 },

  // Фрукты и ягоды
  { name: 'Банан', category: 'fruits', calories_per_100g: 89, protein_per_100g: 1.1, fat_per_100g: 0.3, carbs_per_100g: 22.8, piece_weight_g: 120, serving_name: 'шт' },
  { name: 'Яблоко', category: 'fruits', calories_per_100g: 52, protein_per_100g: 0.3, fat_per_100g: 0.2, carbs_per_100g: 13.8, piece_weight_g: 180, serving_name: 'шт' },
  { name: 'Апельсин', category: 'fruits', calories_per_100g: 43, protein_per_100g: 0.9, fat_per_100g: 0.1, carbs_per_100g: 10.6, piece_weight_g: 200, serving_name: 'шт' },
  { name: 'Клубника', category: 'fruits', calories_per_100g: 32, protein_per_100g: 0.7, fat_per_100g: 0.3, carbs_per_100g: 7.7 },
  { name: 'Виноград', category: 'fruits', calories_per_100g: 65, protein_per_100g: 0.6, fat_per_100g: 0.4, carbs_per_100g: 16.8 },
  { name: 'Груша', category: 'fruits', calories_per_100g: 57, protein_per_100g: 0.4, fat_per_100g: 0.1, carbs_per_100g: 15.2, piece_weight_g: 180, serving_name: 'шт' },
  { name: 'Киви', category: 'fruits', calories_per_100g: 61, protein_per_100g: 1.1, fat_per_100g: 0.5, carbs_per_100g: 14.7, piece_weight_g: 75, serving_name: 'шт' },
  { name: 'Черника', category: 'fruits', calories_per_100g: 57, protein_per_100g: 0.7, fat_per_100g: 0.3, carbs_per_100g: 14.5 },
  { name: 'Мандарин', category: 'fruits', calories_per_100g: 53, protein_per_100g: 0.8, fat_per_100g: 0.3, carbs_per_100g: 13.3, piece_weight_g: 80, serving_name: 'шт' },
  { name: 'Персик', category: 'fruits', calories_per_100g: 46, protein_per_100g: 0.9, fat_per_100g: 0.1, carbs_per_100g: 11.3, piece_weight_g: 150, serving_name: 'шт' },
  { name: 'Слива', category: 'fruits', calories_per_100g: 42, protein_per_100g: 0.8, fat_per_100g: 0.3, carbs_per_100g: 9.6, piece_weight_g: 40, serving_name: 'шт' },
  { name: 'Абрикос', category: 'fruits', calories_per_100g: 41, protein_per_100g: 0.9, fat_per_100g: 0.1, carbs_per_100g: 9, piece_weight_g: 40, serving_name: 'шт' },
  { name: 'Малина', category: 'fruits', calories_per_100g: 46, protein_per_100g: 0.8, fat_per_100g: 0.5, carbs_per_100g: 8.3 },
  { name: 'Арбуз', category: 'fruits', calories_per_100g: 27, protein_per_100g: 0.6, fat_per_100g: 0.1, carbs_per_100g: 5.8 },
  { name: 'Дыня', category: 'fruits', calories_per_100g: 33, protein_per_100g: 0.6, fat_per_100g: 0.3, carbs_per_100g: 7.4 },
  { name: 'Ананас', category: 'fruits', calories_per_100g: 49, protein_per_100g: 0.5, fat_per_100g: 0.1, carbs_per_100g: 11.5 },
  { name: 'Грейпфрут', category: 'fruits', calories_per_100g: 35, protein_per_100g: 0.7, fat_per_100g: 0.2, carbs_per_100g: 6.5, piece_weight_g: 200, serving_name: 'шт' },
  { name: 'Гранат', category: 'fruits', calories_per_100g: 52, protein_per_100g: 0.9, fat_per_100g: 0.3, carbs_per_100g: 11.8 },
  { name: 'Манго', category: 'fruits', calories_per_100g: 60, protein_per_100g: 0.5, fat_per_100g: 0.3, carbs_per_100g: 14 },

  // Бобовые и орехи
  { name: 'Чечевица (сухая)', category: 'legumes', calories_per_100g: 352, protein_per_100g: 24.6, fat_per_100g: 1.1, carbs_per_100g: 63.4 },
  { name: 'Нут (сухой)', category: 'legumes', calories_per_100g: 364, protein_per_100g: 19, fat_per_100g: 6.1, carbs_per_100g: 60.6 },
  { name: 'Фасоль красная (сухая)', category: 'legumes', calories_per_100g: 333, protein_per_100g: 23.6, fat_per_100g: 0.8, carbs_per_100g: 60.8 },
  { name: 'Горох (сухой)', category: 'legumes', calories_per_100g: 298, protein_per_100g: 20.5, fat_per_100g: 2, carbs_per_100g: 49.5 },
  { name: 'Соя (сухая)', category: 'legumes', calories_per_100g: 364, protein_per_100g: 34.9, fat_per_100g: 17.3, carbs_per_100g: 17.3 },
  { name: 'Арахис', category: 'legumes', calories_per_100g: 567, protein_per_100g: 25.8, fat_per_100g: 49.2, carbs_per_100g: 16.1 },
  { name: 'Миндаль', category: 'legumes', calories_per_100g: 579, protein_per_100g: 21.2, fat_per_100g: 49.9, carbs_per_100g: 21.6 },
  { name: 'Грецкий орех', category: 'legumes', calories_per_100g: 654, protein_per_100g: 15.2, fat_per_100g: 65.2, carbs_per_100g: 7 },
  { name: 'Кешью', category: 'legumes', calories_per_100g: 553, protein_per_100g: 18.2, fat_per_100g: 43.9, carbs_per_100g: 30.2 },
  { name: 'Фундук', category: 'legumes', calories_per_100g: 628, protein_per_100g: 15, fat_per_100g: 61, carbs_per_100g: 9.9 },
  { name: 'Семечки подсолнечника', category: 'legumes', calories_per_100g: 584, protein_per_100g: 20.7, fat_per_100g: 52.9, carbs_per_100g: 20 },
  { name: 'Семена чиа', category: 'legumes', calories_per_100g: 486, protein_per_100g: 16.5, fat_per_100g: 30.7, carbs_per_100g: 42.1 },
  { name: 'Семена льна', category: 'legumes', calories_per_100g: 534, protein_per_100g: 18.3, fat_per_100g: 42.2, carbs_per_100g: 28.9 },

  // Масла и соусы
  { name: 'Масло подсолнечное', category: 'oils', calories_per_100g: 899, protein_per_100g: 0, fat_per_100g: 99.9, carbs_per_100g: 0, piece_weight_g: 10, serving_name: 'ст.л.' },
  { name: 'Масло оливковое', category: 'oils', calories_per_100g: 898, protein_per_100g: 0, fat_per_100g: 99.8, carbs_per_100g: 0, piece_weight_g: 10, serving_name: 'ст.л.' },
  { name: 'Масло кокосовое', category: 'oils', calories_per_100g: 899, protein_per_100g: 0, fat_per_100g: 99.9, carbs_per_100g: 0, piece_weight_g: 10, serving_name: 'ст.л.' },
  { name: 'Майонез', category: 'oils', calories_per_100g: 629, protein_per_100g: 2.8, fat_per_100g: 67, carbs_per_100g: 3.7, piece_weight_g: 15, serving_name: 'ст.л.' },
  { name: 'Кетчуп', category: 'oils', calories_per_100g: 112, protein_per_100g: 1.8, fat_per_100g: 1, carbs_per_100g: 25.9, piece_weight_g: 15, serving_name: 'ст.л.' },
  { name: 'Соевый соус', category: 'oils', calories_per_100g: 53, protein_per_100g: 8.1, fat_per_100g: 0, carbs_per_100g: 4.9, piece_weight_g: 15, serving_name: 'ст.л.' },
  { name: 'Горчица', category: 'oils', calories_per_100g: 162, protein_per_100g: 5.7, fat_per_100g: 9, carbs_per_100g: 22.4, piece_weight_g: 5, serving_name: 'ч.л.' },
  { name: 'Уксус бальзамический', category: 'oils', calories_per_100g: 88, protein_per_100g: 0.5, fat_per_100g: 0, carbs_per_100g: 17 },

  // Сладкое и снеки
  { name: 'Мёд', category: 'sweets', calories_per_100g: 304, protein_per_100g: 0.3, fat_per_100g: 0, carbs_per_100g: 82.4, piece_weight_g: 15, serving_name: 'ст.л.' },
  { name: 'Шоколад молочный', category: 'sweets', calories_per_100g: 535, protein_per_100g: 7.6, fat_per_100g: 29.7, carbs_per_100g: 59.4 },
  { name: 'Шоколад тёмный (70%)', category: 'sweets', calories_per_100g: 530, protein_per_100g: 7.8, fat_per_100g: 34, carbs_per_100g: 48 },
  { name: 'Сахар', category: 'sweets', calories_per_100g: 387, protein_per_100g: 0, fat_per_100g: 0, carbs_per_100g: 99.7, piece_weight_g: 5, serving_name: 'ч.л.' },
  { name: 'Зефир', category: 'sweets', calories_per_100g: 304, protein_per_100g: 0.8, fat_per_100g: 0, carbs_per_100g: 79 },
  { name: 'Мармелад', category: 'sweets', calories_per_100g: 293, protein_per_100g: 0, fat_per_100g: 0.1, carbs_per_100g: 77 },
  { name: 'Печенье овсяное', category: 'sweets', calories_per_100g: 437, protein_per_100g: 6.5, fat_per_100g: 18, carbs_per_100g: 64.7 },
  { name: 'Вафли', category: 'sweets', calories_per_100g: 425, protein_per_100g: 3.2, fat_per_100g: 20, carbs_per_100g: 65 },
  { name: 'Чипсы картофельные', category: 'sweets', calories_per_100g: 536, protein_per_100g: 6.6, fat_per_100g: 35, carbs_per_100g: 50 },
  { name: 'Мороженое пломбир', category: 'sweets', calories_per_100g: 227, protein_per_100g: 3.5, fat_per_100g: 15, carbs_per_100g: 20.2 },

  // Напитки
  { name: 'Протеин сывороточный (порошок)', category: 'drinks', calories_per_100g: 380, protein_per_100g: 75, fat_per_100g: 5, carbs_per_100g: 10, piece_weight_g: 30, serving_name: 'мерная ложка' },
  { name: 'Сок апельсиновый', category: 'drinks', calories_per_100g: 45, protein_per_100g: 0.7, fat_per_100g: 0.2, carbs_per_100g: 10 },
  { name: 'Сок яблочный', category: 'drinks', calories_per_100g: 46, protein_per_100g: 0.4, fat_per_100g: 0.4, carbs_per_100g: 11 },
  { name: 'Кола', category: 'drinks', calories_per_100g: 42, protein_per_100g: 0, fat_per_100g: 0, carbs_per_100g: 10.6 },

  // Полуфабрикаты
  { name: 'Консервированный тунец в масле', category: 'prepared', calories_per_100g: 190, protein_per_100g: 27.1, fat_per_100g: 9, carbs_per_100g: 0 },
  { name: 'Фасоль консервированная', category: 'prepared', calories_per_100g: 99, protein_per_100g: 6.7, fat_per_100g: 0.3, carbs_per_100g: 17.4 },
  { name: 'Кукуруза консервированная', category: 'prepared', calories_per_100g: 78, protein_per_100g: 2.9, fat_per_100g: 0.5, carbs_per_100g: 14.6 },
  { name: 'Горошек консервированный', category: 'prepared', calories_per_100g: 55, protein_per_100g: 3.1, fat_per_100g: 0.2, carbs_per_100g: 8.1 },
  { name: 'Пельмени', category: 'prepared', calories_per_100g: 275, protein_per_100g: 11.9, fat_per_100g: 12.4, carbs_per_100g: 28.6 },
  { name: 'Сырники', category: 'prepared', calories_per_100g: 221, protein_per_100g: 16, fat_per_100g: 8, carbs_per_100g: 19 },
]
