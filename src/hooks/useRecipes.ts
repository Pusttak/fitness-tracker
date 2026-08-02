import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import { per100g, sumIngredients, type RecipeIngredientDraft } from '../lib/recipeMath'
import type { Product, Recipe } from '../types/database'

export interface RecipeWithCount extends Recipe {
  ingredientCount: number
}

type NewRecipeFields = Omit<Recipe, 'id' | 'user_id' | 'created_at'>

export function useRecipes() {
  const { user } = useAuth()
  const { reportError } = useErrorReporter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredientCounts, setIngredientCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchRecipes = useCallback(async () => {
    if (!user) {
      setRecipes([])
      setIngredientCounts({})
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase.from('recipes').select('*').eq('user_id', user.id).order('name')
    const list = (data as Recipe[] | null) ?? []
    setRecipes(list)

    if (list.length > 0) {
      const { data: ingredientRows } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .in('recipe_id', list.map((r) => r.id))

      const counts: Record<string, number> = {}
      for (const row of (ingredientRows as { recipe_id: string }[] | null) ?? []) {
        counts[row.recipe_id] = (counts[row.recipe_id] ?? 0) + 1
      }
      setIngredientCounts(counts)
    } else {
      setIngredientCounts({})
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const recipesWithCount = useMemo<RecipeWithCount[]>(
    () => recipes.map((r) => ({ ...r, ingredientCount: ingredientCounts[r.id] ?? 0 })),
    [recipes, ingredientCounts],
  )

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return recipesWithCount
    return recipesWithCount.filter((r) => r.name.toLowerCase().includes(query))
  }, [recipesWithCount, search])

  async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredientDraft[]> {
    const { data } = await supabase
      .from('recipe_ingredients')
      .select('weight_g, products(*)')
      .eq('recipe_id', recipeId)

    return ((data as { weight_g: number; products: Product | null }[] | null) ?? [])
      .filter((row): row is { weight_g: number; products: Product } => row.products !== null)
      .map((row) => ({ product: row.products, weight_g: row.weight_g }))
  }

  async function saveRecipe(
    name: string,
    ingredients: RecipeIngredientDraft[],
    finishedWeightG: number,
    existingId?: string,
  ): Promise<Recipe> {
    if (!user) throw new Error('Пользователь не авторизован')

    try {
      const totals = sumIngredients(ingredients)
      const macros = per100g(totals, finishedWeightG)

      const recipeFields: NewRecipeFields = {
        name: name.trim(),
        total_weight_g: finishedWeightG,
        calories_per_100g: Math.round(macros.calories),
        protein_per_100g: Math.round(macros.protein),
        fat_per_100g: Math.round(macros.fat),
        carbs_per_100g: Math.round(macros.carbs),
      }

      let recipe: Recipe

      if (existingId) {
        const { data, error } = await supabase
          .from('recipes')
          .update(recipeFields)
          .eq('id', existingId)
          .select()
          .single()
        if (error || !data) throw error ?? new Error('Не удалось сохранить рецепт')
        recipe = data as Recipe

        await supabase.from('recipe_ingredients').delete().eq('recipe_id', existingId)
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({ ...recipeFields, user_id: user.id })
          .select()
          .single()
        if (error || !data) throw error ?? new Error('Не удалось сохранить рецепт')
        recipe = data as Recipe
      }

      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(
          ingredients.map((ing) => ({
            recipe_id: recipe.id,
            product_id: ing.product.id,
            weight_g: ing.weight_g,
          })),
        )
        if (ingredientsError) throw ingredientsError
      }

      await fetchRecipes()
      return recipe
    } catch (error) {
      await reportError('useRecipes.saveRecipe', error, { name, existingId })
      throw error
    }
  }

  async function deleteRecipe(id: string) {
    const previous = recipes
    setRecipes((prev) => prev.filter((r) => r.id !== id))

    try {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      setRecipes(previous)
      await reportError('useRecipes.deleteRecipe', error, { id })
      throw error
    }
  }

  return {
    recipes: recipesWithCount,
    loading,
    search,
    setSearch,
    searchResults,
    getRecipeIngredients,
    saveRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  }
}
