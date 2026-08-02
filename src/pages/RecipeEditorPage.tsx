import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Search, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useProducts } from '../hooks/useProducts'
import { useRecipes } from '../hooks/useRecipes'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { per100g, sumIngredients, sumIngredientWeight, type RecipeIngredientDraft } from '../lib/recipeMath'
import { isValidNumberInput } from '../lib/validation'
import type { MealType, Product } from '../types/database'

type View = 'main' | 'addIngredientSearch' | 'addIngredientGrams'

const QUICK_PORTIONS = [50, 100, 150, 200, 250, 300]

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
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

  const { recipes, getRecipeIngredients, saveRecipe } = useRecipes()
  const { searchResults, favorites, recent, setSearch: setProductSearch } = useProducts()
  const recipeForm = useDirtyForm()

  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>([])
  const [finishedWeight, setFinishedWeight] = useState('')
  const [finishedWeightTouched, setFinishedWeightTouched] = useState(false)
  const [loadedExisting, setLoadedExisting] = useState(!id)

  const [view, setView] = useState<View>('main')
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [candidateProduct, setCandidateProduct] = useState<Product | null>(null)
  const [candidateGrams, setCandidateGrams] = useState('100')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const candidateGramsValue = parseDecimal(candidateGrams)
  const candidateGramsValid = isValidNumberInput(candidateGrams, { min: 1, max: 5000 })
  const candidateMacros = useMemo(() => {
    if (!candidateProduct || !candidateGramsValid) return null
    const factor = candidateGramsValue / 100
    return {
      calories: Math.round(candidateProduct.calories_per_100g * factor),
      protein: Math.round(candidateProduct.protein_per_100g * factor),
      fat: Math.round(candidateProduct.fat_per_100g * factor),
      carbs: Math.round(candidateProduct.carbs_per_100g * factor),
    }
  }, [candidateProduct, candidateGramsValid, candidateGramsValue])

  const canSave = name.trim().length > 0 && ingredients.length > 0 && finishedWeightValid

  function handleBack() {
    if (view !== 'main') {
      setView('main')
      setCandidateProduct(null)
      return
    }
    recipeForm.handleBack(() => navigate(-1))
  }

  function handleSelectCandidate(product: Product) {
    setCandidateProduct(product)
    setCandidateGrams('100')
    setView('addIngredientGrams')
  }

  function handleAddIngredient() {
    if (!candidateProduct || !candidateGramsValid) return
    setIngredients((prev) => [...prev, { product: candidateProduct, weight_g: candidateGramsValue }])
    setCandidateProduct(null)
    setIngredientQuery('')
    setView('main')
    recipeForm.markDirty()
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
                <IngredientRow key={`${ing.product.id}-${index}`} ingredient={ing} onRemove={() => handleRemoveIngredient(index)} />
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
            {submitting ? 'Сохраняем…' : 'Сохранить рецепт'}
          </button>
        </div>
      )}

      {view === 'addIngredientSearch' && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
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
                <p className="py-4 text-center text-sm text-foreground/50">Ничего не найдено</p>
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
        </div>
      )}

      {view === 'addIngredientGrams' && candidateProduct && (
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          <p className="text-lg font-semibold text-foreground">{candidateProduct.name}</p>

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

          {candidateMacros && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-sm text-foreground/80">
                {candidateGramsValue}г →{' '}
                <span className="font-semibold text-foreground">{candidateMacros.calories} ккал</span> · Б:{' '}
                {candidateMacros.protein}г · Ж: {candidateMacros.fat}г · У: {candidateMacros.carbs}г
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddIngredient}
            disabled={!candidateGramsValid}
            className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
          >
            Добавить ингредиент
          </button>
        </div>
      )}

      {recipeForm.showConfirm && (
        <UnsavedChangesModal onStay={recipeForm.cancelLeave} onLeave={recipeForm.confirmLeave} />
      )}
    </div>
  )
}

function IngredientRow({ ingredient, onRemove }: { ingredient: RecipeIngredientDraft; onRemove: () => void }) {
  const factor = ingredient.weight_g / 100
  const calories = Math.round(ingredient.product.calories_per_100g * factor)
  const protein = Math.round(ingredient.product.protein_per_100g * factor)
  const fat = Math.round(ingredient.product.fat_per_100g * factor)
  const carbs = Math.round(ingredient.product.carbs_per_100g * factor)

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-foreground">
          {ingredient.product.name} — {ingredient.weight_g}г — {calories} ккал
        </span>
        <span className="text-xs text-foreground/50">
          Б: {protein}г · Ж: {fat}г · У: {carbs}г
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40 hover:bg-overlay/5 hover:text-red-400"
      >
        <X size={16} />
      </button>
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
