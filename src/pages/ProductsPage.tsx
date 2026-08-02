import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useHideBottomNav } from '../context/LayoutChromeContext'
import { useProducts } from '../hooks/useProducts'
import { useRecipes, type RecipeWithCount } from '../hooks/useRecipes'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { SwipeActions } from '../components/SwipeActions'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { isValidNumberInput } from '../lib/validation'
import { ProductsPageSkeleton } from '../components/PageSkeletons'
import { ErrorState } from '../components/ErrorState'
import type { Product } from '../types/database'

type Tab = 'products' | 'recipes'
type ProductFilter = 'all' | 'favorites'
type ProductView = 'list' | 'form'

type UnitMode = 'per100g' | 'perPiece'

const SERVING_NAME_OPTIONS = ['шт', 'ломтик', 'стакан', 'ст.л.', 'ч.л.']

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function per100ToPerPiece(per100: number, pieceWeight: number): number {
  return round1((per100 * pieceWeight) / 100)
}

function perPieceTo100(perPiece: number, pieceWeight: number): number {
  return round1((perPiece / pieceWeight) * 100)
}

function pluralizeIngredients(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ингредиент`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ингредиента`
  return `${n} ингредиентов`
}

const fieldInputClasses =
  'min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent'

interface DeleteTarget {
  id: string
  name: string
  inUse: boolean
}

export function ProductsPage() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('products')

  const [productView, setProductView] = useState<ProductView>('list')
  useHideBottomNav(productView === 'form')
  const [productFilter, setProductFilter] = useState<ProductFilter>('all')
  const [productQuery, setProductQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteRecipeTarget, setDeleteRecipeTarget] = useState<RecipeWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formName, setFormName] = useState('')
  const [formCalories, setFormCalories] = useState('')
  const [formProtein, setFormProtein] = useState('')
  const [formFat, setFormFat] = useState('')
  const [formCarbs, setFormCarbs] = useState('')
  const [formFavorite, setFormFavorite] = useState(false)
  const [formUnitMode, setFormUnitMode] = useState<UnitMode>('per100g')
  const [formPieceWeight, setFormPieceWeight] = useState('')
  const [formServingName, setFormServingName] = useState('шт')

  const {
    products,
    loading: productsLoading,
    error: productsError,
    retry: productsRetry,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    checkProductInUse,
  } = useProducts()
  const { recipes, loading: recipesLoading, deleteRecipe } = useRecipes()
  const navigate = useNavigate()
  const productForm = useDirtyForm()

  function updateFormName(v: string) {
    setFormName(v)
    productForm.markDirty()
  }
  function updateFormCalories(v: string) {
    setFormCalories(v)
    productForm.markDirty()
  }
  function updateFormProtein(v: string) {
    setFormProtein(v)
    productForm.markDirty()
  }
  function updateFormFat(v: string) {
    setFormFat(v)
    productForm.markDirty()
  }
  function updateFormCarbs(v: string) {
    setFormCarbs(v)
    productForm.markDirty()
  }
  function updateFormFavorite(v: boolean) {
    setFormFavorite(v)
    productForm.markDirty()
  }
  function updateFormUnitMode(v: UnitMode) {
    setFormUnitMode(v)
    productForm.markDirty()
  }
  function updateFormPieceWeight(v: string) {
    setFormPieceWeight(v)
    productForm.markDirty()
  }
  function updateFormServingName(v: string) {
    setFormServingName(v)
    productForm.markDirty()
  }

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    return products
      .filter((p) => (productFilter === 'favorites' ? p.is_favorite : true))
      .filter((p) => (query ? p.name.toLowerCase().includes(query) : true))
  }, [products, productFilter, productQuery])

  const macroFieldValid = (v: string) => isValidNumberInput(v, { min: 0, max: 1000 })
  const pieceWeightValid = isValidNumberInput(formPieceWeight, { min: 1, max: 5000 })
  const formValid =
    formName.trim().length > 0 &&
    [formCalories, formProtein, formFat, formCarbs].every(macroFieldValid) &&
    (formUnitMode === 'per100g' || pieceWeightValid)

  function openCreateForm() {
    setEditingProduct(null)
    setFormName('')
    setFormCalories('')
    setFormProtein('')
    setFormFat('')
    setFormCarbs('')
    setFormFavorite(false)
    setFormUnitMode('per100g')
    setFormPieceWeight('')
    setFormServingName('шт')
    productForm.markClean()
    setProductView('form')
  }

  const handleEditProduct = useCallback(
    (product: Product) => {
      setEditingProduct(product)
      setFormName(product.name)
      setFormFavorite(product.is_favorite)

      if (product.piece_weight_g) {
        setFormUnitMode('perPiece')
        setFormPieceWeight(String(product.piece_weight_g))
        setFormServingName(product.serving_name || 'шт')
        setFormCalories(String(per100ToPerPiece(product.calories_per_100g, product.piece_weight_g)))
        setFormProtein(String(per100ToPerPiece(product.protein_per_100g, product.piece_weight_g)))
        setFormFat(String(per100ToPerPiece(product.fat_per_100g, product.piece_weight_g)))
        setFormCarbs(String(per100ToPerPiece(product.carbs_per_100g, product.piece_weight_g)))
      } else {
        setFormUnitMode('per100g')
        setFormPieceWeight('')
        setFormServingName('шт')
        setFormCalories(String(product.calories_per_100g))
        setFormProtein(String(product.protein_per_100g))
        setFormFat(String(product.fat_per_100g))
        setFormCarbs(String(product.carbs_per_100g))
      }

      productForm.markClean()
      setProductView('form')
    },
    [productForm],
  )

  const handleToggleFavorite = useCallback(
    (id: string) => {
      toggleFavorite(id)
    },
    [toggleFavorite],
  )

  async function handleSaveForm() {
    if (!formValid) return
    setSubmitting(true)

    const patch =
      formUnitMode === 'perPiece'
        ? (() => {
            const pieceWeight = parseDecimal(formPieceWeight)
            return {
              name: formName.trim(),
              calories_per_100g: perPieceTo100(parseDecimal(formCalories), pieceWeight),
              protein_per_100g: perPieceTo100(parseDecimal(formProtein), pieceWeight),
              fat_per_100g: perPieceTo100(parseDecimal(formFat), pieceWeight),
              carbs_per_100g: perPieceTo100(parseDecimal(formCarbs), pieceWeight),
              is_favorite: formFavorite,
              piece_weight_g: pieceWeight,
              serving_name: formServingName.trim() || 'шт',
            }
          })()
        : {
            name: formName.trim(),
            calories_per_100g: parseDecimal(formCalories),
            protein_per_100g: parseDecimal(formProtein),
            fat_per_100g: parseDecimal(formFat),
            carbs_per_100g: parseDecimal(formCarbs),
            is_favorite: formFavorite,
            piece_weight_g: null,
            serving_name: 'шт',
          }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, patch)
      } else {
        await addProduct(patch)
      }
      showToast('Сохранено ✓')
      productForm.markClean()
      setProductView('list')
    } catch {
      // ошибка уже показана тостом внутри useProducts
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      const inUse = await checkProductInUse(product.id)
      setDeleteTarget({ id: product.id, name: product.name, inUse })
    },
    [checkProductInUse],
  )

  async function handleConfirmDeleteProduct() {
    if (!deleteTarget) return
    await deleteProduct(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (productsLoading || recipesLoading) {
    return <ProductsPageSkeleton />
  }

  if (productsError) {
    return (
      <div className="px-4 pt-6">
        <ErrorState message={productsError} onRetry={productsRetry} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      {productView === 'form' ? (
        <ProductForm
          isEditing={editingProduct !== null}
          name={formName}
          onNameChange={updateFormName}
          calories={formCalories}
          onCaloriesChange={updateFormCalories}
          protein={formProtein}
          onProteinChange={updateFormProtein}
          fat={formFat}
          onFatChange={updateFormFat}
          carbs={formCarbs}
          onCarbsChange={updateFormCarbs}
          favorite={formFavorite}
          onFavoriteChange={updateFormFavorite}
          unitMode={formUnitMode}
          onUnitModeChange={updateFormUnitMode}
          pieceWeight={formPieceWeight}
          onPieceWeightChange={updateFormPieceWeight}
          servingName={formServingName}
          onServingNameChange={updateFormServingName}
          valid={formValid}
          submitting={submitting}
          onCancel={() => productForm.handleBack(() => setProductView('list'))}
          onSave={handleSaveForm}
        />
      ) : (
        <>
          <div className="flex gap-1 rounded-xl bg-surface p-1">
            <TabButton active={tab === 'products'} onClick={() => setTab('products')}>
              Продукты
            </TabButton>
            <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')}>
              Рецепты
            </TabButton>
          </div>

          {tab === 'products' && (
            <>
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Поиск продукта"
                  className="min-h-[44px] w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-foreground outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-1 rounded-xl bg-surface p-1">
                <TabButton active={productFilter === 'all'} onClick={() => setProductFilter('all')}>
                  Все
                </TabButton>
                <TabButton active={productFilter === 'favorites'} onClick={() => setProductFilter('favorites')}>
                  Избранные
                </TabButton>
              </div>

              <button
                type="button"
                onClick={openCreateForm}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
              >
                <Plus size={16} /> Новый продукт
              </button>

              <div className="flex flex-col gap-2">
                {filteredProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-foreground/50">Ничего не найдено</p>
                ) : (
                  filteredProducts.map((product) => (
                    <SwipeActions
                      key={product.id}
                      actions={[
                        {
                          label: 'Изменить',
                          icon: Pencil,
                          colorClass: 'bg-overlay/10 text-foreground',
                          onClick: () => handleEditProduct(product),
                        },
                        {
                          label: 'Удалить',
                          icon: Trash2,
                          colorClass: 'bg-red-500 text-white',
                          onClick: () => handleDeleteProduct(product),
                        },
                      ]}
                    >
                      <ProductLibraryRow
                        product={product}
                        onTap={handleEditProduct}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    </SwipeActions>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'recipes' && (
            <>
              <button
                type="button"
                onClick={() => navigate('/recipes/new')}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
              >
                <Plus size={16} /> Новый рецепт
              </button>

              <div className="flex flex-col gap-2">
                {recipes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-foreground/50">Пока нет сохранённых рецептов</p>
                ) : (
                  recipes.map((recipe) => (
                    <SwipeActions
                      key={recipe.id}
                      actions={[
                        {
                          label: 'Удалить',
                          icon: Trash2,
                          colorClass: 'bg-red-500 text-white',
                          onClick: () => setDeleteRecipeTarget(recipe),
                        },
                      ]}
                    >
                      <RecipeLibraryRow recipe={recipe} onTap={() => navigate(`/recipes/${recipe.id}`)} />
                    </SwipeActions>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить продукт?"
          message={
            deleteTarget.inUse
              ? `«${deleteTarget.name}» уже есть в истории приёмов пищи. Записи сохранятся с уже посчитанными КБЖУ, но сам продукт будет удалён из базы.`
              : `Удалить «${deleteTarget.name}» из базы продуктов?`
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDeleteProduct}
        />
      )}

      {deleteRecipeTarget && (
        <ConfirmModal
          title="Удалить рецепт?"
          message={`Удалить «${deleteRecipeTarget.name}» из базы рецептов?`}
          onCancel={() => setDeleteRecipeTarget(null)}
          onConfirm={async () => {
            await deleteRecipe(deleteRecipeTarget.id)
            setDeleteRecipeTarget(null)
          }}
        />
      )}

      {productForm.showConfirm && (
        <UnsavedChangesModal onStay={productForm.cancelLeave} onLeave={productForm.confirmLeave} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
        active ? 'bg-accent text-background' : 'text-foreground/60'
      }`}
    >
      {children}
    </button>
  )
}

const ProductLibraryRow = memo(function ProductLibraryRow({
  product,
  onTap,
  onToggleFavorite,
}: {
  product: Product
  onTap: (product: Product) => void
  onToggleFavorite: (id: string) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3 bg-surface p-3">
      <button
        type="button"
        onClick={() => onTap(product)}
        className="flex flex-1 flex-col items-start gap-0.5 text-left"
      >
        <span className="text-sm font-medium text-foreground">{product.name}</span>
        <span className="text-xs text-foreground/50">
          {product.calories_per_100g} ккал · Б: {product.protein_per_100g}г · Ж: {product.fat_per_100g}г · У:{' '}
          {product.carbs_per_100g}г <span className="text-foreground/30">на 100г</span>
          {product.piece_weight_g && (
            <span className="text-foreground/30">
              {' '}
              · 1 {product.serving_name} = {product.piece_weight_g}г
            </span>
          )}
        </span>
      </button>
      <button type="button" onClick={() => onToggleFavorite(product.id)} className="shrink-0 p-1">
        <Star
          size={18}
          className={product.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-foreground/30'}
        />
      </button>
    </div>
  )
})

function RecipeLibraryRow({ recipe, onTap }: { recipe: RecipeWithCount; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full flex-col items-start gap-0.5 bg-surface p-3 text-left"
    >
      <span className="text-sm font-medium text-foreground">{recipe.name}</span>
      <span className="text-xs text-foreground/50">
        {recipe.calories_per_100g} ккал · Б: {recipe.protein_per_100g}г · Ж: {recipe.fat_per_100g}г · У:{' '}
        {recipe.carbs_per_100g}г <span className="text-foreground/30">на 100г</span> ·{' '}
        {pluralizeIngredients(recipe.ingredientCount)}
      </span>
    </button>
  )
}

interface ProductFormProps {
  isEditing: boolean
  name: string
  onNameChange: (v: string) => void
  calories: string
  onCaloriesChange: (v: string) => void
  protein: string
  onProteinChange: (v: string) => void
  fat: string
  onFatChange: (v: string) => void
  carbs: string
  onCarbsChange: (v: string) => void
  favorite: boolean
  onFavoriteChange: (v: boolean) => void
  unitMode: UnitMode
  onUnitModeChange: (v: UnitMode) => void
  pieceWeight: string
  onPieceWeightChange: (v: string) => void
  servingName: string
  onServingNameChange: (v: string) => void
  valid: boolean
  submitting: boolean
  onCancel: () => void
  onSave: () => void
}

function ProductForm({
  isEditing,
  name,
  onNameChange,
  calories,
  onCaloriesChange,
  protein,
  onProteinChange,
  fat,
  onFatChange,
  carbs,
  onCarbsChange,
  favorite,
  onFavoriteChange,
  unitMode,
  onUnitModeChange,
  pieceWeight,
  onPieceWeightChange,
  servingName,
  onServingNameChange,
  valid,
  submitting,
  onCancel,
  onSave,
}: ProductFormProps) {
  function fieldError(value: string): string | null {
    if (value.trim() === '') return null
    return isValidNumberInput(value, { min: 0, max: 1000 }) ? null : 'От 0 до 1000'
  }

  function pieceWeightError(value: string): string | null {
    if (value.trim() === '') return null
    return isValidNumberInput(value, { min: 1, max: 5000 }) ? null : 'От 1 до 5000'
  }

  const unitLabel = unitMode === 'perPiece' ? `1 ${servingName || 'шт'}` : '100г'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-foreground">
        {isEditing ? 'Редактировать продукт' : 'Новый продукт'}
      </p>

      <Field label="Название">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Например, куриная грудка"
          className={fieldInputClasses}
        />
      </Field>

      <Field label="Указать КБЖУ на:">
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          <button
            type="button"
            onClick={() => onUnitModeChange('per100g')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              unitMode === 'per100g' ? 'bg-accent text-background' : 'text-foreground/60'
            }`}
          >
            100 грамм
          </button>
          <button
            type="button"
            onClick={() => onUnitModeChange('perPiece')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              unitMode === 'perPiece' ? 'bg-accent text-background' : 'text-foreground/60'
            }`}
          >
            1 штуку / порцию
          </button>
        </div>
      </Field>

      {unitMode === 'perPiece' && (
        <>
          <Field label="Вес 1 штуки (г)" error={pieceWeightError(pieceWeight)}>
            <input
              type="text"
              inputMode="decimal"
              value={pieceWeight}
              onChange={(e) => onPieceWeightChange(e.target.value)}
              placeholder="60"
              className={`${fieldInputClasses} ${pieceWeightError(pieceWeight) ? 'border-red-400' : ''}`}
            />
          </Field>

          <Field label="Название порции">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {SERVING_NAME_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onServingNameChange(option)}
                    className={`min-h-[36px] rounded-lg border px-3 text-sm font-medium transition ${
                      servingName === option
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface text-foreground'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={servingName}
                onChange={(e) => onServingNameChange(e.target.value)}
                placeholder="Свой вариант"
                className={fieldInputClasses}
              />
            </div>
          </Field>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Калории на ${unitLabel}`} error={fieldError(calories)}>
          <input
            type="text"
            inputMode="decimal"
            value={calories}
            onChange={(e) => onCaloriesChange(e.target.value)}
            className={`${fieldInputClasses} ${fieldError(calories) ? 'border-red-400' : ''}`}
          />
        </Field>
        <Field label={`Белки на ${unitLabel}`} error={fieldError(protein)}>
          <input
            type="text"
            inputMode="decimal"
            value={protein}
            onChange={(e) => onProteinChange(e.target.value)}
            className={`${fieldInputClasses} ${fieldError(protein) ? 'border-red-400' : ''}`}
          />
        </Field>
        <Field label={`Жиры на ${unitLabel}`} error={fieldError(fat)}>
          <input
            type="text"
            inputMode="decimal"
            value={fat}
            onChange={(e) => onFatChange(e.target.value)}
            className={`${fieldInputClasses} ${fieldError(fat) ? 'border-red-400' : ''}`}
          />
        </Field>
        <Field label={`Углеводы на ${unitLabel}`} error={fieldError(carbs)}>
          <input
            type="text"
            inputMode="decimal"
            value={carbs}
            onChange={(e) => onCarbsChange(e.target.value)}
            className={`${fieldInputClasses} ${fieldError(carbs) ? 'border-red-400' : ''}`}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={favorite}
          onChange={(e) => onFavoriteChange(e.target.checked)}
          className="h-5 w-5 rounded border-border bg-surface accent-accent"
        />
        Добавить в избранное
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl border border-border font-medium text-foreground"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!valid || submitting}
          className="min-h-[48px] flex-1 rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
        >
          {submitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground/70">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-6 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-app rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="pb-2 text-lg font-semibold text-foreground">{title}</p>
        <p className="pb-4 text-sm text-foreground/70">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl border border-border font-medium text-foreground"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-xl bg-red-500 font-medium text-white"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}
