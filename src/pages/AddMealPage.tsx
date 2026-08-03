import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { useProducts } from '../hooks/useProducts'
import { useRecipes } from '../hooks/useRecipes'
import { useMeals, type MealGroup } from '../hooks/useMeals'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useFormPersist } from '../hooks/useFormPersist'
import { SwipeActions } from '../components/SwipeActions'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../lib/mealTypes'
import { isValidNumberInput } from '../lib/validation'
import { getLocalToday, parseLocalDate } from '../lib/dates'
import { COMMON_PRODUCTS, PRODUCT_CATEGORIES, type CommonProduct } from '../data/commonProducts'
import type { MealType, Product, Recipe } from '../types/database'

type ContentTab = 'products' | 'catalog' | 'recipes' | 'quick'
type SubView = 'list' | 'productGrams' | 'newProduct' | 'recipeGrams' | 'catalogGrams'

const QUICK_PORTIONS = [50, 100, 150, 200, 250, 300]
const QUICK_PIECES = [0.5, 1, 1.5, 2, 3]

type GramsMode = 'grams' | 'pieces'

interface AddMealDraft {
  mealType: MealType
}

const ADD_MEAL_DRAFT_DEFAULT: AddMealDraft = {
  mealType: 'breakfast',
}

const CONTENT_TABS: { value: ContentTab; label: string }[] = [
  { value: 'products', label: 'Мои' },
  { value: 'catalog', label: 'Каталог' },
  { value: 'recipes', label: 'Рецепты' },
  { value: 'quick', label: 'Быстрый ввод' },
]

function todayIso(): string {
  return getLocalToday()
}

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

function formatDayMonth(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parseLocalDate(dateIso))
}

function pluralizeProducts(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} продукт`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} продукта`
  return `${n} продуктов`
}

function formatCompactMealItem(item: MealGroup['items'][number]): string {
  if (item.weight_g !== null && item.pieceWeightG) {
    const pieces = Number((item.weight_g / item.pieceWeightG).toFixed(2))
    return `${item.displayName} ${pieces} ${item.servingName ?? 'шт'}`
  }
  if (item.weight_g !== null) {
    return `${item.displayName} ${item.weight_g}г`
  }
  return item.displayName
}

const fieldInputClasses =
  'min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent'

interface NavState {
  source?: 'add-meal'
  date?: string
  mealType?: MealType
  initialTab?: ContentTab
  selectRecipeId?: string
}

export function AddMealPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const navState = (location.state as NavState | null) ?? null

  const { values: addMealDraft, setValues: setAddMealDraft } = useFormPersist<AddMealDraft>(
    'add-meal-form',
    ADD_MEAL_DRAFT_DEFAULT,
  )

  const [date] = useState(() => navState?.date ?? searchParams.get('date') ?? todayIso())
  const [mealType, setMealType] = useState<MealType>(
    () => navState?.mealType ?? (searchParams.get('type') as MealType | null) ?? addMealDraft.mealType,
  )

  const { meals, retry: retryMeals, deleteItem: deleteMealItem } = useMeals(date)
  const currentMealGroup = meals[mealType]

  const [contentTab, setContentTab] = useState<ContentTab>(navState?.initialTab ?? 'products')
  const [subView, setSubView] = useState<SubView>('list')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Продукты
  const [productQuery, setProductQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [gramsInput, setGramsInput] = useState('100')
  const [gramsMode, setGramsMode] = useState<GramsMode>('grams')
  const [piecesInput, setPiecesInput] = useState('1')

  // Персистим только тип приёма пищи — выбранный продукт никогда не восстанавливаем
  // из sessionStorage, иначе повторное открытие «+ Добавить» сразу показывает
  // карточку последнего выбранного продукта вместо экрана выбора.
  useEffect(() => {
    setAddMealDraft({ mealType })
  }, [mealType, setAddMealDraft])

  const [newName, setNewName] = useState('')
  const [newCalories, setNewCalories] = useState('')
  const [newProtein, setNewProtein] = useState('')
  const [newFat, setNewFat] = useState('')
  const [newCarbs, setNewCarbs] = useState('')
  const [newFavorite, setNewFavorite] = useState(false)

  const { products, searchResults, favorites, recent, setSearch: setProductSearch, addProduct } = useProducts()

  useEffect(() => {
    const timeout = setTimeout(() => setProductSearch(productQuery), 300)
    return () => clearTimeout(timeout)
  }, [productQuery, setProductSearch])

  // Каталог
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null)
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CommonProduct | null>(null)
  const [catalogGramsInput, setCatalogGramsInput] = useState('100')
  const [catalogGramsMode, setCatalogGramsMode] = useState<GramsMode>('grams')
  const [catalogPiecesInput, setCatalogPiecesInput] = useState('1')

  const catalogSearchResults = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase()
    if (!query) return []
    return COMMON_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query))
  }, [catalogQuery])

  const categoryProducts = useMemo(
    () => COMMON_PRODUCTS.filter((p) => p.category === catalogCategory),
    [catalogCategory],
  )

  // Рецепты
  const [recipeQuery, setRecipeQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeGramsInput, setRecipeGramsInput] = useState('100')
  const [initialSelectionApplied, setInitialSelectionApplied] = useState(false)

  const { recipes, searchResults: recipeSearchResults, setSearch: setRecipeSearch } = useRecipes()

  useEffect(() => {
    const timeout = setTimeout(() => setRecipeSearch(recipeQuery), 300)
    return () => clearTimeout(timeout)
  }, [recipeQuery, setRecipeSearch])

  useEffect(() => {
    if (!navState?.selectRecipeId || initialSelectionApplied) return
    const recipe = recipes.find((r) => r.id === navState.selectRecipeId)
    if (!recipe) return
    setSelectedRecipe(recipe)
    setRecipeGramsInput(String(recipe.total_weight_g))
    setSubView('recipeGrams')
    setInitialSelectionApplied(true)
  }, [navState?.selectRecipeId, recipes, initialSelectionApplied])

  // Быстрый ввод
  const [quickName, setQuickName] = useState('')
  const [quickCalories, setQuickCalories] = useState('')
  const [quickProtein, setQuickProtein] = useState('')
  const [quickFat, setQuickFat] = useState('')
  const [quickCarbs, setQuickCarbs] = useState('')
  const [quickGrams, setQuickGrams] = useState('')
  const quickForm = useDirtyForm()

  function updateQuickName(v: string) {
    setQuickName(v)
    quickForm.markDirty()
  }
  function updateQuickCalories(v: string) {
    setQuickCalories(v)
    quickForm.markDirty()
  }
  function updateQuickProtein(v: string) {
    setQuickProtein(v)
    quickForm.markDirty()
  }
  function updateQuickFat(v: string) {
    setQuickFat(v)
    quickForm.markDirty()
  }
  function updateQuickCarbs(v: string) {
    setQuickCarbs(v)
    quickForm.markDirty()
  }
  function updateQuickGrams(v: string) {
    setQuickGrams(v)
    quickForm.markDirty()
  }

  const pieceWeight = selectedProduct?.piece_weight_g ?? null
  const piecesValid = isValidNumberInput(piecesInput, { min: 0.1, max: 100 })
  const piecesValue = parseDecimal(piecesInput)

  const grams =
    gramsMode === 'pieces' && pieceWeight ? piecesValue * pieceWeight : parseDecimal(gramsInput)
  const gramsValid =
    gramsMode === 'pieces' ? pieceWeight !== null && piecesValid : isValidNumberInput(gramsInput, { min: 1, max: 5000 })

  const macros = useMemo(() => {
    if (!selectedProduct || !gramsValid) return null
    return {
      calories: Math.round((selectedProduct.calories_per_100g * grams) / 100),
      protein: Math.round((selectedProduct.protein_per_100g * grams) / 100),
      fat: Math.round((selectedProduct.fat_per_100g * grams) / 100),
      carbs: Math.round((selectedProduct.carbs_per_100g * grams) / 100),
    }
  }, [selectedProduct, gramsValid, grams])

  const catalogPieceWeight = selectedCatalogProduct?.piece_weight_g ?? null
  const catalogPiecesValid = isValidNumberInput(catalogPiecesInput, { min: 0.1, max: 100 })
  const catalogPiecesValue = parseDecimal(catalogPiecesInput)

  const catalogGrams =
    catalogGramsMode === 'pieces' && catalogPieceWeight
      ? catalogPiecesValue * catalogPieceWeight
      : parseDecimal(catalogGramsInput)
  const catalogGramsValid =
    catalogGramsMode === 'pieces'
      ? catalogPieceWeight !== null && catalogPiecesValid
      : isValidNumberInput(catalogGramsInput, { min: 1, max: 5000 })

  const catalogMacros = useMemo(() => {
    if (!selectedCatalogProduct || !catalogGramsValid) return null
    return {
      calories: Math.round((selectedCatalogProduct.calories_per_100g * catalogGrams) / 100),
      protein: Math.round((selectedCatalogProduct.protein_per_100g * catalogGrams) / 100),
      fat: Math.round((selectedCatalogProduct.fat_per_100g * catalogGrams) / 100),
      carbs: Math.round((selectedCatalogProduct.carbs_per_100g * catalogGrams) / 100),
    }
  }, [selectedCatalogProduct, catalogGramsValid, catalogGrams])

  const newProductValid =
    newName.trim().length > 0 &&
    [newCalories, newProtein, newFat, newCarbs].every((v) => isValidNumberInput(v, { min: 0, max: 1000 }))

  const recipeGrams = parseDecimal(recipeGramsInput)
  const recipeGramsValid = isValidNumberInput(recipeGramsInput, { min: 1, max: 5000 })

  const recipeMacros = useMemo(() => {
    if (!selectedRecipe || !recipeGramsValid) return null
    return {
      calories: Math.round((selectedRecipe.calories_per_100g * recipeGrams) / 100),
      protein: Math.round((selectedRecipe.protein_per_100g * recipeGrams) / 100),
      fat: Math.round((selectedRecipe.fat_per_100g * recipeGrams) / 100),
      carbs: Math.round((selectedRecipe.carbs_per_100g * recipeGrams) / 100),
    }
  }, [selectedRecipe, recipeGramsValid, recipeGrams])

  const quickGramsProvided = quickGrams.trim() !== ''
  const quickGramsValue = parseDecimal(quickGrams)
  const quickValid =
    [quickCalories, quickProtein, quickFat, quickCarbs].every((v) => isValidNumberInput(v, { min: 0, max: 1000 })) &&
    (!quickGramsProvided || isValidNumberInput(quickGrams, { min: 1, max: 5000 }))

  function handleTabChange(tab: ContentTab) {
    setContentTab(tab)
    setSubView('list')
    setSelectedProduct(null)
    setSelectedRecipe(null)
    setSelectedCatalogProduct(null)
    setCatalogCategory(null)
    setError(null)
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product)
    setGramsInput('100')
    setPiecesInput('1')
    setGramsMode(product.piece_weight_g ? 'pieces' : 'grams')
    setError(null)
    setSubView('productGrams')
  }

  function handleSelectCatalogProduct(product: CommonProduct) {
    setSelectedCatalogProduct(product)
    setCatalogGramsInput('100')
    setCatalogPiecesInput('1')
    setCatalogGramsMode(product.piece_weight_g ? 'pieces' : 'grams')
    setError(null)
    setSubView('catalogGrams')
  }

  function handleSelectRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe)
    setRecipeGramsInput(String(recipe.total_weight_g))
    setError(null)
    setSubView('recipeGrams')
  }

  function handleBack() {
    if (subView !== 'list') {
      setSubView('list')
      setSelectedProduct(null)
      setSelectedRecipe(null)
      setSelectedCatalogProduct(null)
      setError(null)
      return
    }
    if (contentTab === 'quick') {
      quickForm.handleBack(() => navigate(-1))
    } else {
      navigate(`/?date=${date}`, { replace: true })
    }
  }

  function handleOpenCatalogFromProducts() {
    setCatalogQuery(productQuery)
    setContentTab('catalog')
    setCatalogCategory(null)
    setError(null)
  }

  async function findOrCreatePersonalProduct(commonProduct: CommonProduct): Promise<Product> {
    const existing = products.find((p) => p.name === commonProduct.name)
    if (existing) return existing

    return addProduct({
      name: commonProduct.name,
      calories_per_100g: commonProduct.calories_per_100g,
      protein_per_100g: commonProduct.protein_per_100g,
      fat_per_100g: commonProduct.fat_per_100g,
      carbs_per_100g: commonProduct.carbs_per_100g,
      is_favorite: false,
      piece_weight_g: commonProduct.piece_weight_g ?? null,
      serving_name: commonProduct.serving_name ?? 'шт',
    })
  }

  function handleOpenNewProduct() {
    setNewName(productQuery.trim())
    setError(null)
    setSubView('newProduct')
  }

  function handleOpenNewRecipe() {
    navigate('/recipes/new', { state: { source: 'add-meal', date, mealType } })
  }

  async function handleSaveNewProduct() {
    if (!newProductValid) return
    setSubmitting(true)
    setError(null)

    try {
      const product = await addProduct({
        name: newName.trim(),
        calories_per_100g: parseDecimal(newCalories),
        protein_per_100g: parseDecimal(newProtein),
        fat_per_100g: parseDecimal(newFat),
        carbs_per_100g: parseDecimal(newCarbs),
        is_favorite: newFavorite,
        piece_weight_g: null,
        serving_name: 'шт',
      })
      setSelectedProduct(product)
      setGramsInput('100')
      setPiecesInput('1')
      setGramsMode('grams')
      setSubView('productGrams')
    } catch {
      setError('Не удалось сохранить продукт. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  async function findOrCreateMealId(): Promise<string | null> {
    if (!user) return null

    const { data: existingLog } = await supabase
      .from('meal_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('meal_type', mealType)
      .maybeSingle()

    if (existingLog?.id) return existingLog.id

    const { data: newLog, error: logError } = await supabase
      .from('meal_log')
      .insert({ user_id: user.id, date, meal_type: mealType })
      .select('id')
      .single()

    if (logError || !newLog) return null
    return newLog.id
  }

  async function handleAddProductToMeal() {
    if (!selectedProduct || !macros || !gramsValid) return
    setSubmitting(true)
    setError(null)

    const mealId = await findOrCreateMealId()
    if (!mealId) {
      setError('Не удалось сохранить приём пищи. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: itemError } = await supabase.from('meal_items').insert({
      meal_id: mealId,
      product_id: selectedProduct.id,
      recipe_id: null,
      weight_g: grams,
      calories: macros.calories,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
    })

    if (itemError) {
      setError('Не удалось добавить продукт. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    showToast('Добавлено ✓')
    await retryMeals()
    setSelectedProduct(null)
    setGramsInput('100')
    setPiecesInput('1')
    setGramsMode('grams')
    setSubView('list')
    setSubmitting(false)
  }

  async function handleAddCatalogProductToMeal() {
    if (!selectedCatalogProduct || !catalogMacros || !catalogGramsValid) return
    setSubmitting(true)
    setError(null)

    try {
      const product = await findOrCreatePersonalProduct(selectedCatalogProduct)

      const mealId = await findOrCreateMealId()
      if (!mealId) {
        setError('Не удалось сохранить приём пищи. Попробуйте ещё раз.')
        setSubmitting(false)
        return
      }

      const { error: itemError } = await supabase.from('meal_items').insert({
        meal_id: mealId,
        product_id: product.id,
        recipe_id: null,
        weight_g: catalogGrams,
        calories: catalogMacros.calories,
        protein: catalogMacros.protein,
        fat: catalogMacros.fat,
        carbs: catalogMacros.carbs,
      })

      if (itemError) {
        setError('Не удалось добавить продукт. Попробуйте ещё раз.')
        setSubmitting(false)
        return
      }

      showToast('Добавлено ✓')
      await retryMeals()
      setSelectedCatalogProduct(null)
      setCatalogGramsInput('100')
      setCatalogPiecesInput('1')
      setCatalogGramsMode('grams')
      setSubView('list')
    } catch {
      setError('Не удалось добавить продукт. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddRecipeToMeal() {
    if (!selectedRecipe || !recipeMacros || !recipeGramsValid) return
    setSubmitting(true)
    setError(null)

    const mealId = await findOrCreateMealId()
    if (!mealId) {
      setError('Не удалось сохранить приём пищи. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: itemError } = await supabase.from('meal_items').insert({
      meal_id: mealId,
      product_id: null,
      recipe_id: selectedRecipe.id,
      weight_g: recipeGrams,
      calories: recipeMacros.calories,
      protein: recipeMacros.protein,
      fat: recipeMacros.fat,
      carbs: recipeMacros.carbs,
    })

    if (itemError) {
      setError('Не удалось добавить рецепт. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    showToast('Сохранено ✓')
    navigate(`/?date=${date}`, { replace: true })
  }

  async function handleAddQuick() {
    if (!quickValid) return
    setSubmitting(true)
    setError(null)

    const mealId = await findOrCreateMealId()
    if (!mealId) {
      setError('Не удалось сохранить приём пищи. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: itemError } = await supabase.from('meal_items').insert({
      meal_id: mealId,
      product_id: null,
      recipe_id: null,
      name: quickName.trim() || null,
      weight_g: quickGramsProvided ? quickGramsValue : null,
      calories: Math.round(parseDecimal(quickCalories)),
      protein: Math.round(parseDecimal(quickProtein)),
      fat: Math.round(parseDecimal(quickFat)),
      carbs: Math.round(parseDecimal(quickCarbs)),
    })

    if (itemError) {
      setError('Не удалось добавить запись. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    showToast('Сохранено ✓')
    quickForm.markClean()
    navigate(`/?date=${date}`, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition hover:bg-overlay/5"
        >
          <ChevronLeft size={22} />
        </button>
        <p className="text-sm text-foreground/50">{formatDayMonth(date)}</p>
        <div className="h-10 w-10" />
      </div>

      <div className="flex gap-2 px-4 pb-2 pt-2">
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setMealType(type)}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium transition ${
              mealType === type
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-surface text-foreground/70'
            }`}
          >
            {MEAL_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {subView === 'list' && (
        <MealSummaryBar
          mealType={mealType}
          group={currentMealGroup}
          onDeleteItem={(itemId) => deleteMealItem(itemId, mealType)}
        />
      )}

      {subView === 'list' && (
        <div className="flex gap-2 px-4 pb-2">
          {CONTENT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                contentTab === tab.value ? 'bg-accent text-background' : 'bg-surface text-foreground/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {contentTab === 'products' && subView === 'list' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              autoFocus
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Поиск продукта"
              className="min-h-[48px] w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-foreground outline-none focus:border-accent"
            />
          </div>

          {productQuery.trim() ? (
            <div className="flex flex-col gap-2">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-center text-sm text-foreground/50">Ничего не найдено</p>
                  <button
                    type="button"
                    onClick={handleOpenCatalogFromProducts}
                    className="text-sm font-medium text-accent"
                  >
                    Не нашёл? Посмотри в Каталоге →
                  </button>
                </div>
              ) : (
                searchResults.map((p) => (
                  <ProductRow key={p.id} product={p} onSelect={() => handleSelectProduct(p)} />
                ))
              )}
            </div>
          ) : (
            <>
              <ProductSection
                title="Избранное"
                products={favorites}
                onSelect={handleSelectProduct}
                emptyText="Пока нет избранных продуктов"
              />
              <ProductSection
                title="Недавние"
                products={recent}
                onSelect={handleSelectProduct}
                emptyText="Пока нет недавних продуктов"
              />
            </>
          )}

          <button
            type="button"
            onClick={handleOpenNewProduct}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
          >
            <Plus size={16} /> Новый продукт
          </button>
        </div>
      )}

      {contentTab === 'products' && subView === 'productGrams' && selectedProduct && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">{selectedProduct.name}</p>

          {pieceWeight && (
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setGramsMode('grams')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  gramsMode === 'grams' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                Граммы
              </button>
              <button
                type="button"
                onClick={() => setGramsMode('pieces')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  gramsMode === 'pieces' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                {selectedProduct.serving_name || 'Штуки'}
              </button>
            </div>
          )}

          {gramsMode === 'pieces' && pieceWeight ? (
            <>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={piecesInput}
                  onChange={(e) => setPiecesInput(e.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-16 text-lg text-foreground outline-none focus:border-accent"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  {selectedProduct.serving_name || 'шт'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {QUICK_PIECES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPiecesInput(String(p))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      piecesInput === String(p)
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-12 text-lg text-foreground outline-none focus:border-accent"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  г
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {QUICK_PORTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGramsInput(String(g))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      gramsInput === String(g)
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface text-foreground'
                    }`}
                  >
                    {g}г
                  </button>
                ))}
              </div>
            </>
          )}

          {macros && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-sm text-foreground/80">
                {gramsMode === 'pieces' && pieceWeight
                  ? `${piecesValue} ${selectedProduct.serving_name || 'шт'} (${grams}г)`
                  : `${grams}г`}{' '}
                → <span className="font-semibold text-foreground">{macros.calories} ккал</span> · Б:{' '}
                {macros.protein}г · Ж: {macros.fat}г · У: {macros.carbs}г
              </p>
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleAddProductToMeal}
            disabled={!gramsValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      )}

      {contentTab === 'products' && subView === 'newProduct' && (
        <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">Новый продукт</p>

          <Field label="Название">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например, куриная грудка"
              className={fieldInputClasses}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Калории на 100г">
              <input
                type="text"
                inputMode="decimal"
                value={newCalories}
                onChange={(e) => setNewCalories(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Белки на 100г">
              <input
                type="text"
                inputMode="decimal"
                value={newProtein}
                onChange={(e) => setNewProtein(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Жиры на 100г">
              <input
                type="text"
                inputMode="decimal"
                value={newFat}
                onChange={(e) => setNewFat(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Углеводы на 100г">
              <input
                type="text"
                inputMode="decimal"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={newFavorite}
              onChange={(e) => setNewFavorite(e.target.checked)}
              className="h-5 w-5 rounded border-border bg-surface accent-accent"
            />
            Добавить в избранное
          </label>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleSaveNewProduct}
            disabled={!newProductValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      )}

      {contentTab === 'catalog' && subView === 'list' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              autoFocus
              type="text"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Поиск в каталоге"
              className="min-h-[48px] w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-foreground outline-none focus:border-accent"
            />
          </div>

          {catalogQuery.trim() ? (
            <div className="flex flex-col gap-2">
              {catalogSearchResults.length === 0 ? (
                <p className="py-4 text-center text-sm text-foreground/50">Ничего не найдено</p>
              ) : (
                catalogSearchResults.map((p) => (
                  <CatalogProductRow key={p.name} product={p} onSelect={() => handleSelectCatalogProduct(p)} />
                ))
              )}
            </div>
          ) : catalogCategory === null ? (
            <div className="grid grid-cols-2 gap-3">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatalogCategory(cat.id)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-center text-sm font-medium text-foreground">{cat.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCatalogCategory(null)}
                className="flex items-center gap-1 self-start text-sm font-medium text-accent"
              >
                <ChevronLeft size={16} /> Назад к категориям
              </button>
              {categoryProducts.map((p) => (
                <CatalogProductRow key={p.name} product={p} onSelect={() => handleSelectCatalogProduct(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {contentTab === 'catalog' && subView === 'catalogGrams' && selectedCatalogProduct && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">{selectedCatalogProduct.name}</p>

          {catalogPieceWeight && (
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setCatalogGramsMode('grams')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  catalogGramsMode === 'grams' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                Граммы
              </button>
              <button
                type="button"
                onClick={() => setCatalogGramsMode('pieces')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  catalogGramsMode === 'pieces' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                {selectedCatalogProduct.serving_name || 'Штуки'}
              </button>
            </div>
          )}

          {catalogGramsMode === 'pieces' && catalogPieceWeight ? (
            <>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={catalogPiecesInput}
                  onChange={(e) => setCatalogPiecesInput(e.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-16 text-lg text-foreground outline-none focus:border-accent"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  {selectedCatalogProduct.serving_name || 'шт'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {QUICK_PIECES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCatalogPiecesInput(String(p))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      catalogPiecesInput === String(p)
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={catalogGramsInput}
                  onChange={(e) => setCatalogGramsInput(e.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-12 text-lg text-foreground outline-none focus:border-accent"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  г
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {QUICK_PORTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCatalogGramsInput(String(g))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      catalogGramsInput === String(g)
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface text-foreground'
                    }`}
                  >
                    {g}г
                  </button>
                ))}
              </div>
            </>
          )}

          {catalogMacros && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-sm text-foreground/80">
                {catalogGramsMode === 'pieces' && catalogPieceWeight
                  ? `${catalogPiecesValue} ${selectedCatalogProduct.serving_name || 'шт'} (${catalogGrams}г)`
                  : `${catalogGrams}г`}{' '}
                → <span className="font-semibold text-foreground">{catalogMacros.calories} ккал</span> · Б:{' '}
                {catalogMacros.protein}г · Ж: {catalogMacros.fat}г · У: {catalogMacros.carbs}г
              </p>
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleAddCatalogProductToMeal}
            disabled={!catalogGramsValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      )}

      {contentTab === 'recipes' && subView === 'list' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              type="text"
              value={recipeQuery}
              onChange={(e) => setRecipeQuery(e.target.value)}
              placeholder="Поиск рецепта"
              className="min-h-[48px] w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-foreground outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-2">
            {recipeSearchResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-foreground/50">
                {recipeQuery.trim() ? 'Ничего не найдено' : 'Пока нет сохранённых рецептов'}
              </p>
            ) : (
              recipeSearchResults.map((r) => (
                <RecipeRow key={r.id} recipe={r} onSelect={() => handleSelectRecipe(r)} />
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenNewRecipe}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
          >
            <Plus size={16} /> Новый рецепт
          </button>
        </div>
      )}

      {contentTab === 'recipes' && subView === 'recipeGrams' && selectedRecipe && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">{selectedRecipe.name}</p>

          <div className="relative">
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={recipeGramsInput}
              onChange={(e) => setRecipeGramsInput(e.target.value)}
              className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-12 text-lg text-foreground outline-none focus:border-accent"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
              г
            </span>
          </div>

          {recipeMacros && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-sm text-foreground/80">
                {recipeGrams}г → <span className="font-semibold text-foreground">{recipeMacros.calories} ккал</span>{' '}
                · Б: {recipeMacros.protein}г · Ж: {recipeMacros.fat}г · У: {recipeMacros.carbs}г
              </p>
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleAddRecipeToMeal}
            disabled={!recipeGramsValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      )}

      {contentTab === 'quick' && (
        <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
          <Field label="Название (опционально)">
            <input
              type="text"
              value={quickName}
              onChange={(e) => updateQuickName(e.target.value)}
              placeholder="Например, «Обед в кафе»"
              className={fieldInputClasses}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Калории">
              <input
                type="text"
                inputMode="decimal"
                value={quickCalories}
                onChange={(e) => updateQuickCalories(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Белки">
              <input
                type="text"
                inputMode="decimal"
                value={quickProtein}
                onChange={(e) => updateQuickProtein(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Жиры">
              <input
                type="text"
                inputMode="decimal"
                value={quickFat}
                onChange={(e) => updateQuickFat(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
            <Field label="Углеводы">
              <input
                type="text"
                inputMode="decimal"
                value={quickCarbs}
                onChange={(e) => updateQuickCarbs(e.target.value)}
                className={fieldInputClasses}
              />
            </Field>
          </div>

          <Field label="Граммы (опционально)">
            <input
              type="text"
              inputMode="decimal"
              value={quickGrams}
              onChange={(e) => updateQuickGrams(e.target.value)}
              className={fieldInputClasses}
            />
          </Field>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleAddQuick}
            disabled={!quickValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      )}

      {quickForm.showConfirm && (
        <UnsavedChangesModal onStay={quickForm.cancelLeave} onLeave={quickForm.confirmLeave} />
      )}
    </div>
  )
}

function MealSummaryBar({
  mealType,
  group,
  onDeleteItem,
}: {
  mealType: MealType
  group: MealGroup
  onDeleteItem: (itemId: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 pb-2">
      <p className="text-sm font-medium text-foreground">
        {MEAL_TYPE_LABELS[mealType]} · {pluralizeProducts(group.items.length)} · {Math.round(group.totalCalories)} ккал
      </p>
      {group.items.length > 0 && (
        <div className="flex flex-col gap-1 overflow-hidden rounded-xl">
          {group.items.map((item) => (
            <SwipeActions
              key={item.id}
              actions={[
                {
                  label: 'Удалить',
                  icon: Trash2,
                  colorClass: 'bg-red-500 text-white',
                  onClick: () => onDeleteItem(item.id),
                },
              ]}
            >
              <div className="truncate bg-surface px-3 py-1.5 text-xs text-foreground/70">
                {formatCompactMealItem(item)}
              </div>
            </SwipeActions>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground/70">{label}</label>
      {children}
    </div>
  )
}

function ProductRow({ product, onSelect }: { product: Product; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface p-3 text-left"
    >
      <span className="text-sm font-medium text-foreground">{product.name}</span>
      <span className="text-xs text-foreground/50">
        {product.calories_per_100g} ккал · Б: {product.protein_per_100g}г · Ж: {product.fat_per_100g}г · У:{' '}
        {product.carbs_per_100g}г <span className="text-foreground/30">на 100г</span>
      </span>
    </button>
  )
}

function CatalogProductRow({ product, onSelect }: { product: CommonProduct; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface p-3 text-left"
    >
      <span className="text-sm font-medium text-foreground">{product.name}</span>
      <span className="text-xs text-foreground/50">
        {product.calories_per_100g} ккал · Б: {product.protein_per_100g}г · Ж: {product.fat_per_100g}г · У:{' '}
        {product.carbs_per_100g}г <span className="text-foreground/30">на 100г</span>
        {product.piece_weight_g && (
          <span className="text-foreground/30">
            {' '}
            · 1 {product.serving_name ?? 'шт'} = {product.piece_weight_g}г
          </span>
        )}
      </span>
    </button>
  )
}

function ProductSection({
  title,
  products,
  onSelect,
  emptyText,
}: {
  title: string
  products: Product[]
  onSelect: (product: Product) => void
  emptyText: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-foreground/70">{title}</h2>
      {products.length === 0 ? (
        <p className="text-sm text-foreground/40">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} onSelect={() => onSelect(p)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecipeRow({ recipe, onSelect }: { recipe: Recipe; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-surface p-3 text-left"
    >
      <span className="text-sm font-medium text-foreground">{recipe.name}</span>
      <span className="text-xs text-foreground/50">
        {recipe.calories_per_100g} ккал · Б: {recipe.protein_per_100g}г · Ж: {recipe.fat_per_100g}г · У:{' '}
        {recipe.carbs_per_100g}г <span className="text-foreground/30">на 100г</span>
      </span>
    </button>
  )
}
