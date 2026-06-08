import { useState, useCallback, useMemo } from 'react'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'

export interface UseServerPaginationOptions<T> {
  queryKey: string[]
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; count: number }>
  pageSize?: number
  initialPage?: number
}

export interface UseServerPaginationReturn<T> {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  isFetching: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  prefetchNextPage: () => void
}

export function useServerPagination<T>({
  queryKey,
  fetcher,
  pageSize = 25,
  initialPage = 0,
}: UseServerPaginationOptions<T>): UseServerPaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const queryClient = useQueryClient()

  // JSON.stringify pour une clé stable (queryKey est un tableau)
  const queryKeyStr = JSON.stringify(queryKey)

  const pageQueryKey = useMemo(
    () => [...queryKey, 'page', currentPage, 'size', pageSize],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKeyStr, currentPage, pageSize],
  )
  const nextPageQueryKey = useMemo(
    () => [...queryKey, 'page', currentPage + 1, 'size', pageSize],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKeyStr, currentPage, pageSize],
  )

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey: pageQueryKey,
    queryFn: () => fetcher(currentPage, pageSize),
    placeholderData: keepPreviousData,
  })

  const data = result?.data ?? []
  const totalCount = result?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const prefetchNextPage = useCallback(() => {
    if (currentPage + 1 < totalPages) {
      queryClient.prefetchQuery({
        queryKey: nextPageQueryKey,
        queryFn: () => fetcher(currentPage + 1, pageSize),
      })
    }
  }, [queryClient, nextPageQueryKey, fetcher, currentPage, pageSize, totalPages])

  // Auto-prefetch next page after data loads
  if (!isLoading && !isFetching && currentPage + 1 < totalPages) {
    queryClient.prefetchQuery({
      queryKey: nextPageQueryKey,
      queryFn: () => fetcher(currentPage + 1, pageSize),
    })
  }

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0))
  }, [])

  return {
    data,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    isFetching,
    goToPage,
    nextPage,
    prevPage,
    prefetchNextPage,
  }
}
