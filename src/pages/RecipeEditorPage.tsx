import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useProducts } from '../hooks/useProducts'
import { useRecipes } from '../hooks/useRecipes'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useFormPersist } from '../hooks/useFormPersist'
import { SwipeActions } from '../components/SwipeActions'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { per100g, sumIngredients, sumIngredientWeight, type RecipeIngredientDraft } from '../lib/recipeMath'
import { isValidNumberInput } from '../lib/validation'
import { COMMON_PRODUCTS, PRODUCT_CATEGORIES, type CommonProduct } from '../data/commonProducts'
import type { MealType, Product } from '../types/database'

type View = 'main' | 'addIngredientSearch' | 'addIngredientGrams'
type GramsMode = 'grams' | 'pieces'
type IngredientTab = 'products' | 'catalog'

const QUICK_PORTIONS = [50, 100, 150, 200, 250, 300]
const QUICK_PIECES = [0.5, 1, 1.5, 2, 3]

interface RecipeDraft {
  name: string
  ingredients: RecipeIngredientDraft[]
  totalWeight: string
}

const RECIPE_DRAFT_DEFAULT: RecipeDraft = { name: '', ingredients: [], totalWeight: '' }

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

function pluralizeIngredients(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ингредиент`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ингредиента`
  return `${n} ингредиентов`
}

interface NavState {
  source?: 'add-meal'
  date?: string
  mealType?: MealType
}

export function RecipeEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = (location.state as NavState | null) ?? null

  const { recipes, getRecipeIngredients, saveRecipe, deleteRecipe } = useRecipes()
  const { products, searchResults, favorites, recent, setSearch: setProductSearch, addProduct } = useProducts()
  const recipeForm = useDirtyForm()

  const isNew = !id
  const { values: recipeDraft, setValues: setRecipeDraft, clearPersisted: clearRecipeDraft } = useFormPersist<RecipeDraft>(
    'new-recipe-form',
    RECIPE_DRAFT_DEFAULT,
  )

  const [name, setName] = useState(() => (isNew ? recipeDraft.name : ''))
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>(() => (isNew ? recipeDraft.ingredients : []))
  const [finishedWeight, setFinishedWeight] = useState(() => (isNew ? recipeDraft.totalWeight : ''))
  const [finishedWeightTouched, setFinishedWeightTouched] = useState(() => isNew && recipeDraft.totalWeight !== '')
  const [loadedExisting, setLoadedExisting] = useState(!id)

  useEffect(() => {
    if (!isNew) return
    setRecipeDraft({ name, ingredients, totalWeight: finishedWeight })
  }, [isNew, name, ingredients, finishedWeight, setRecipeDraft])

  const [view, setView] = useState<View>('main')
  const [ingredientTab, setIngredientTab] = useState<IngredientTab>('products')
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [candidateProduct, setCandidateProduct] = useState<Product | null>(null)
  const [candidateCatalogProduct, setCandidateCatalogProduct] = useState<CommonProduct | null>(null)
  const [candidateGrams, setCandidateGrams] = useState('100')
  const [candidateGramsMode, setCandidateGramsMode] = useState<GramsMode>('grams')
  const [candidatePieces, setCandidatePieces] = useState('1')

  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null)

  const catalogSearchResults = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase()
    if (!query) return []
    return COMMON_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query))
  }, [catalogQuery])

  const categoryProducts = useMemo(
    () => COMMON_PRODUCTS.filter((p) => p.category === catalogCategory),
    [catalogCategory],
  )

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

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setProductSearch(ingredientQuery), 300)
    return () => clearTimeout(timeout)
  }, [ingredientQuery, setProductSearch])

  useEffect(() => {
    if (!id || loadedExisting) return
    const existing = recipes.find((r) => r.id === id)
    if (!existing) return

    setName(existing.name)
    setFinishedWeight(String(existing.total_weight_g))
    setFinishedWeightTouched(true)

    getRecipeIngredients(id).then((ings) => {
      setIngredients(ings)
      setLoadedExisting(true)
    })
  }, [id, recipes, loadedExisting, getRecipeIngredients])

  const totals = useMemo(() => sumIngredients(ingredients), [ingredients])
  const ingredientsWeightSum = useMemo(() => sumIngredientWeight(ingredients), [ingredients])

  useEffect(() => {
    if (!finishedWeightTouched) {
      setFinishedWeight(ingredientsWeightSum > 0 ? String(ingredientsWeightSum) : '')
    }
  }, [ingredientsWeightSum, finishedWeightTouched])

  const finishedWeightValue = parseDecimal(finishedWeight)
  const finishedWeightValid = isValidNumberInput(finishedWeight, { min: 1, max: 20000 })

  const macrosPer100g = useMemo(
    () => per100g(totals, finishedWeightValid ? finishedWeightValue : 0),
    [totals, finishedWeightValid, finishedWeightValue],
  )

  const candidate = candidateProduct ?? candidateCatalogProduct
  const candidatePieceWeight = candidate?.piece_weight_g ?? null
  const candidateServingName = candidate?.serving_name ?? 'шт'
  const candidatePiecesValid = isValidNumberInput(candidatePieces, { min: 0.1, max: 100 })
  const candidatePiecesValue = parseDecimal(candidatePieces)

  const candidateGramsValue =
    candidateGramsMode === 'pieces' && candidatePieceWeight
      ? candidatePiecesValue * candidatePieceWeight
      : parseDecimal(candidateGrams)
  const candidateGramsValid =
    candidateGramsMode === 'pieces'
      ? candidatePieceWeight !== null && candidatePiecesValid
      : isValidNumberInput(candidateGrams, { min: 1, max: 5000 })

  const candidateMacros = useMemo(() => {
    if (!candidate || !candidateGramsValid) return null
    const factor = candidateGramsValue / 100
    return {
      calories: Math.round(candidate.calories_per_100g * factor),
      protein: Math.round(candidate.protein_per_100g * factor),
      fat: Math.round(candidate.fat_per_100g * factor),
      carbs: Math.round(candidate.carbs_per_100g * factor),
    }
  }, [candidate, candidateGramsValid, candidateGramsValue])

  const canSave = name.trim().length > 0 && ingredients.length > 0 && finishedWeightValid

  function handleBack() {
    if (view !== 'main') {
      setView('main')
      setCandidateProduct(null)
      setCandidateCatalogProduct(null)
      return
    }
    recipeForm.handleBack(() => navigate(-1))
  }

  function handleSelectCandidate(product: Product) {
    setCandidateProduct(product)
    setCandidateCatalogProduct(null)
    setCandidateGrams('100')
    setCandidatePieces('1')
    setCandidateGramsMode(product.piece_weight_g ? 'pieces' : 'grams')
    setView('addIngredientGrams')
  }

  function handleSelectCatalogCandidate(product: CommonProduct) {
    setCandidateCatalogProduct(product)
    setCandidateProduct(null)
    setCandidateGrams('100')
    setCandidatePieces('1')
    setCandidateGramsMode(product.piece_weight_g ? 'pieces' : 'grams')
    setView('addIngredientGrams')
  }

  async function handleAddIngredient() {
    if (!candidate || !candidateGramsValid) return
    setSubmitting(true)
    setError(null)

    try {
      const product = candidateProduct ?? (await findOrCreatePersonalProduct(candidateCatalogProduct as CommonProduct))

      setIngredients((prev) => [
        ...prev,
        {
          product,
          weight_g: candidateGramsValue,
          pieces: candidateGramsMode === 'pieces' && candidatePieceWeight ? candidatePiecesValue : null,
        },
      ])
      setCandidateProduct(null)
      setCandidateCatalogProduct(null)
      setIngredientQuery('')
      setCatalogQuery('')
      setView('addIngredientSearch')
      recipeForm.markDirty()
      showToast('Добавлено ✓')
    } catch {
      setError('Не удалось добавить ингредиент. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRemoveIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
    recipeForm.markDirty()
  }

  async function handleSave() {
    if (!canSave) return
    setSubmitting(true)
    setError(null)

    try {
      const saved = await saveRecipe(name, ingredients, finishedWeightValue, id)
      showToast('Сохранено ✓')
      recipeForm.markClean()
      clearRecipeDraft()
      if (navState?.source === 'add-meal') {
        navigate('/add-meal', {
          state: {
            date: navState.date,
            mealType: navState.mealType,
            initialTab: 'recipes',
            selectRecipeId: saved.id,
          },
          replace: true,
        })
      } else {
        navigate(-1)
      }
    } catch {
      setError('Не удалось сохранить рецепт. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  async function handleDeleteRecipe() {
    if (!id) return
    try {
      await deleteRecipe(id)
      setDeleteConfirmOpen(false)
      navigate('/products', { replace: true })
    } catch {
      setError('Не удалось удалить рецепт. Попробуйте ещё раз.')
    }
  }

  if (id && !loadedExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground/60">
        Загрузка…
      </div>
    )
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
        <p className="text-sm font-medium text-foreground">
          {view === 'main' ? (id ? 'Редактировать рецепт' : 'Новый рецепт') : 'Добавить ингредиент'}
        </p>
        <div className="h-10 w-10" />
      </div>

      {view === 'main' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              recipeForm.markDirty()
            }}
            placeholder="Например, «Яичница с помидором»"
            className="min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent"
          />

          <div className="flex flex-col gap-2">
            {ingredients.length === 0 ? (
              <p className="py-4 text-center text-sm text-foreground/50">Пока нет ингредиентов</p>
            ) : (
              ingredients.map((ing, index) => (
                <SwipeActions
                  key={`${ing.product.id}-${index}`}
                  actions={[
                    {
                      label: 'Удалить',
                      icon: Trash2,
                      colorClass: 'bg-red-500 text-white',
                      onClick: () => handleRemoveIngredient(index),
                    },
                  ]}
                >
                  <IngredientRow ingredient={ing} />
                </SwipeActions>
              ))
            )}

            <button
              type="button"
              onClick={() => setView('addIngredientSearch')}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
            >
              <Plus size={16} /> Добавить ингредиент
            </button>
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm text-foreground/80">
                Итого: <span className="font-semibold text-foreground">{Math.round(totals.calories)} ккал</span> · Б:{' '}
                {Math.round(totals.protein)}г · Ж: {Math.round(totals.fat)}г · У: {Math.round(totals.carbs)}г
              </p>
              <p className="text-xs text-foreground/50">Вес ингредиентов: {ingredientsWeightSum}г</p>

              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-sm text-foreground/70">Вес готового блюда</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={finishedWeight}
                    onChange={(e) => {
                      setFinishedWeightTouched(true)
                      setFinishedWeight(e.target.value)
                      recipeForm.markDirty()
                    }}
                    className={`min-h-[44px] w-full rounded-xl border bg-background px-4 pr-12 text-foreground outline-none focus:border-accent ${
                      finishedWeightTouched && !finishedWeightValid ? 'border-red-400' : 'border-border'
                    }`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                    г
                  </span>
                </div>
                {finishedWeightTouched && !finishedWeightValid && (
                  <p className="text-xs text-red-400">Вес готового блюда должен быть больше 0</p>
                )}
                <p className="text-xs text-foreground/40">
                  Взвесь готовое блюдо. Обычно меньше суммы ингредиентов из-за выпаривания воды
                </p>
              </div>

              {finishedWeightValid && (
                <p className="text-xs text-foreground/50">
                  На 100г: {Math.round(macrosPer100g.calories)} ккал · Б: {Math.round(macrosPer100g.protein)}г · Ж:{' '}
                  {Math.round(macrosPer100g.fat)}г · У: {Math.round(macrosPer100g.carbs)}г
                </p>
              )}
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Сохранить рецепт'}
          </button>

          {id && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="min-h-[44px] font-medium text-red-500"
            >
              Удалить рецепт
            </button>
          )}
        </div>
      )}

      {view === 'addIngredientSearch' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          {ingredients.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground/70">
                Уже добавлено: {pluralizeIngredients(ingredients.length)}
              </p>
              <div className="flex flex-col gap-1 overflow-hidden rounded-xl">
                {ingredients.map((ing, index) => (
                  <SwipeActions
                    key={`${ing.product.id}-${index}`}
                    actions={[
                      {
                        label: 'Удалить',
                        icon: Trash2,
                        colorClass: 'bg-red-500 text-white',
                        onClick: () => handleRemoveIngredient(index),
                      },
                    ]}
                  >
                    <IngredientRow ingredient={ing} />
                  </SwipeActions>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1 rounded-xl bg-surface p-1">
            <button
              type="button"
              onClick={() => setIngredientTab('products')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                ingredientTab === 'products' ? 'bg-accent text-background' : 'text-foreground/60'
              }`}
            >
              Мои
            </button>
            <button
              type="button"
              onClick={() => setIngredientTab('catalog')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                ingredientTab === 'catalog' ? 'bg-accent text-background' : 'text-foreground/60'
              }`}
            >
              Каталог
            </button>
          </div>

          {ingredientTab === 'products' ? (
            <>
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
                  autoFocus
                  type="text"
                  value={ingredientQuery}
                  onChange={(e) => setIngredientQuery(e.target.value)}
                  placeholder="Поиск продукта"
                  className="min-h-[48px] w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-foreground outline-none focus:border-accent"
                />
              </div>

              {ingredientQuery.trim() ? (
                <div className="flex flex-col gap-2">
                  {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-center text-sm text-foreground/50">Ничего не найдено</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogQuery(ingredientQuery)
                          setIngredientTab('catalog')
                        }}
                        className="text-sm font-medium text-accent"
                      >
                        Не нашёл? Посмотри в Каталоге →
                      </button>
                    </div>
                  ) : (
                    searchResults.map((p) => (
                      <IngredientCandidateRow key={p.id} product={p} onSelect={() => handleSelectCandidate(p)} />
                    ))
                  )}
                </div>
              ) : (
                <>
                  <IngredientCandidateSection title="Избранное" products={favorites} onSelect={handleSelectCandidate} />
                  <IngredientCandidateSection title="Недавние" products={recent} onSelect={handleSelectCandidate} />
                </>
              )}
            </>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
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
                      <CatalogCandidateRow key={p.name} product={p} onSelect={() => handleSelectCatalogCandidate(p)} />
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
                    <CatalogCandidateRow key={p.name} product={p} onSelect={() => handleSelectCatalogCandidate(p)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {view === 'addIngredientGrams' && candidate && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">{candidate.name}</p>

          {candidatePieceWeight && (
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setCandidateGramsMode('grams')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  candidateGramsMode === 'grams' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                Граммы
              </button>
              <button
                type="button"
                onClick={() => setCandidateGramsMode('pieces')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  candidateGramsMode === 'pieces' ? 'bg-accent text-background' : 'text-foreground/60'
                }`}
              >
                {candidateServingName || 'Штуки'}
              </button>
            </div>
          )}

          {candidateGramsMode === 'pieces' && candidatePieceWeight ? (
            <>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={candidatePieces}
                  onChange={(e) => setCandidatePieces(e.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 pr-16 text-lg text-foreground outline-none focus:border-accent"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  {candidateServingName || 'шт'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {QUICK_PIECES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCandidatePieces(String(p))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      candidatePieces === String(p)
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
                  value={candidateGrams}
                  onChange={(e) => setCandidateGrams(e.target.value)}
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
                    onClick={() => setCandidateGrams(String(g))}
                    className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                      candidateGrams === String(g)
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

          {candidateMacros && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-sm text-foreground/80">
                {candidateGramsMode === 'pieces' && candidatePieceWeight
                  ? `${candidatePiecesValue} ${candidateServingName || 'шт'} (${candidateGramsValue}г)`
                  : `${candidateGramsValue}г`}{' '}
                → <span className="font-semibold text-foreground">{candidateMacros.calories} ккал</span> · Б:{' '}
                {candidateMacros.protein}г · Ж: {candidateMacros.fat}г · У: {candidateMacros.carbs}г
              </p>
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleAddIngredient}
            disabled={!candidateGramsValid || submitting}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Добавляем…' : 'Добавить ингредиент'}
          </button>
        </div>
      )}

      {recipeForm.showConfirm && (
        <UnsavedChangesModal onStay={recipeForm.cancelLeave} onLeave={recipeForm.confirmLeave} />
      )}

      {deleteConfirmOpen && (
        <ConfirmModal
          title="Удалить рецепт?"
          message={`Удалить рецепт «${name}»? Записи в дневнике питания сохранятся.`}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDeleteRecipe}
        />
      )}
    </div>
  )
}

function IngredientRow({ ingredient }: { ingredient: RecipeIngredientDraft }) {
  const factor = ingredient.weight_g / 100
  const calories = Math.round(ingredient.product.calories_per_100g * factor)
  const protein = Math.round(ingredient.product.protein_per_100g * factor)
  const fat = Math.round(ingredient.product.fat_per_100g * factor)
  const carbs = Math.round(ingredient.product.carbs_per_100g * factor)

  const nameLine =
    ingredient.pieces !== null
      ? `${ingredient.product.name} — ${ingredient.pieces} ${ingredient.product.serving_name || 'шт'} (${ingredient.weight_g}г) — ${calories} ккал`
      : `${ingredient.product.name} — ${ingredient.weight_g}г — ${calories} ккал`

  return (
    <div className="flex flex-col gap-0.5 bg-surface p-3">
      <span className="text-sm text-foreground">{nameLine}</span>
      <span className="text-xs text-foreground/50">
        Б: {protein}г · Ж: {fat}г · У: {carbs}г
      </span>
    </div>
  )
}

function IngredientCandidateRow({ product, onSelect }: { product: Product; onSelect: () => void }) {
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

function CatalogCandidateRow({ product, onSelect }: { product: CommonProduct; onSelect: () => void }) {
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

function IngredientCandidateSection({
  title,
  products,
  onSelect,
}: {
  title: string
  products: Product[]
  onSelect: (product: Product) => void
}) {
  if (products.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-foreground/70">{title}</h2>
      <div className="flex flex-col gap-2">
        {products.map((p) => (
          <IngredientCandidateRow key={p.id} product={p} onSelect={() => onSelect(p)} />
        ))}
      </div>
    </div>
  )
}
