import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import type { Product } from '../types/database'

const RECENT_DAYS = 7
const RECENT_LIMIT = 10
const FAVORITES_LIMIT = 10

type NewProduct = Omit<Product, 'id' | 'user_id' | 'created_at'>

export function useProducts() {
  const { user } = useAuth()
  const { reportError } = useErrorReporter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setProducts([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase.from('products').select('*').eq('user_id', user.id).order('name')

    if (fetchError) {
      setError(fetchError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    setProducts((data as Product[] | null) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const fetchRecent = useCallback(async () => {
    if (!user) {
      setRecentIds([])
      return
    }

    const since = new Date()
    since.setDate(since.getDate() - RECENT_DAYS)
    const sinceIso = since.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('meal_log')
      .select('id, meal_items(product_id)')
      .eq('user_id', user.id)
      .gte('date', sinceIso)

    const counts = new Map<string, number>()
    for (const log of (data as { meal_items: { product_id: string | null }[] }[] | null) ?? []) {
      for (const item of log.meal_items ?? []) {
        if (!item.product_id) continue
        counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + 1)
      }
    }

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, RECENT_LIMIT)
      .map(([id]) => id)

    setRecentIds(sorted)
  }, [user])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  const favorites = useMemo(
    () => products.filter((p) => p.is_favorite).slice(0, FAVORITES_LIMIT),
    [products],
  )

  const recent = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]))
    return recentIds.map((id) => byId.get(id)).filter((p): p is Product => p !== undefined)
  }, [recentIds, products])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return products.filter((p) => p.name.toLowerCase().includes(query))
  }, [products, search])

  async function addProduct(input: NewProduct): Promise<Product> {
    if (!user) throw new Error('Пользователь не авторизован')

    const optimisticId = crypto.randomUUID()
    const optimistic: Product = {
      ...input,
      id: optimisticId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }
    setProducts((prev) => [...prev, optimistic])

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error || !data) throw error ?? new Error('Не удалось сохранить продукт')

      const saved = data as Product
      setProducts((prev) => prev.map((p) => (p.id === optimisticId ? saved : p)))
      return saved
    } catch (error) {
      setProducts((prev) => prev.filter((p) => p.id !== optimisticId))
      await reportError('useProducts.addProduct', error, { input })
      throw error
    }
  }

  async function updateProduct(id: string, patch: Partial<NewProduct>) {
    const previous = products
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

    try {
      const { error } = await supabase.from('products').update(patch).eq('id', id)
      if (error) throw error
    } catch (error) {
      setProducts(previous)
      await reportError('useProducts.updateProduct', error, { id, patch })
      throw error
    }
  }

  async function checkProductInUse(id: string): Promise<boolean> {
    const { count } = await supabase
      .from('meal_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
    return (count ?? 0) > 0
  }

  async function deleteProduct(id: string) {
    const previous = products
    setProducts((prev) => prev.filter((p) => p.id !== id))

    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      setProducts(previous)
      await reportError('useProducts.deleteProduct', error, { id })
      throw error
    }
  }

  async function toggleFavorite(id: string) {
    const product = products.find((p) => p.id === id)
    if (!product) return
    await updateProduct(id, { is_favorite: !product.is_favorite })
  }

  return {
    products,
    loading,
    error,
    search,
    setSearch,
    searchResults,
    favorites,
    recent,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    checkProductInUse,
    retry: fetchProducts,
  }
}
