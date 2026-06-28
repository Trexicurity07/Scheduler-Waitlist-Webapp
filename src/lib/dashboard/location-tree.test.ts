import { describe, it, expect } from 'vitest'
import { buildTree } from './location-tree'

describe('buildTree', () => {
  it('returns an empty array for empty input', () => {
    expect(buildTree([], [])).toEqual([])
  })

  it('returns one root node with empty children/waitlists for a single top-level location', () => {
    const nodes = [
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location',
        name: 'Main Street',
        address: '123 Main St',
        description: null,
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'loc-1',
      parent_id: null,
      type: 'location',
      name: 'Main Street',
      address: '123 Main St',
      description: null,
      sort_order: 0,
    })
    expect(result[0].children).toEqual([])
    expect(result[0].waitlists).toEqual([])
  })

  it('attaches a nested folder to its parent location, not the roots array', () => {
    const nodes = [
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location',
        name: 'Main Street',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'folder-1',
        parent_id: 'loc-1',
        type: 'folder',
        name: 'Upstairs',
        address: null,
        description: null,
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('loc-1')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe('folder-1')
  })

  it('attaches a waitlist to the correct node, not its parent', () => {
    const nodes = [
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location',
        name: 'Main Street',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'folder-1',
        parent_id: 'loc-1',
        type: 'folder',
        name: 'Upstairs',
        address: null,
        description: null,
        sort_order: 0,
      },
    ]
    const waitlists = [
      {
        id: 'wl-1',
        node_id: 'folder-1',
        name: 'Haircuts',
        description: null,
        calendar_status: 'connected',
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, waitlists)

    expect(result[0].waitlists).toEqual([])
    expect(result[0].children[0].waitlists).toHaveLength(1)
    expect(result[0].children[0].waitlists[0].id).toBe('wl-1')
  })

  it('sorts nodes by sort_order ascending', () => {
    const nodes = [
      {
        id: 'loc-2',
        parent_id: null,
        type: 'location' as const,
        name: 'Second',
        address: null,
        description: null,
        sort_order: 2,
      },
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location' as const,
        name: 'First',
        address: null,
        description: null,
        sort_order: 1,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result.map((n) => n.id)).toEqual(['loc-1', 'loc-2'])
  })

  it('breaks ties on sort_order by sorting name alphabetically', () => {
    const nodes = [
      {
        id: 'loc-b',
        parent_id: null,
        type: 'location',
        name: 'Bravo',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'loc-a',
        parent_id: null,
        type: 'location',
        name: 'Alpha',
        address: null,
        description: null,
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result.map((n) => n.id)).toEqual(['loc-a', 'loc-b'])
  })

  it('connects deep nesting: location -> folder -> subfolder', () => {
    const nodes = [
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location',
        name: 'Main Street',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'folder-1',
        parent_id: 'loc-1',
        type: 'folder',
        name: 'Upstairs',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'subfolder-1',
        parent_id: 'folder-1',
        type: 'folder',
        name: 'Room A',
        address: null,
        description: null,
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe('folder-1')
    expect(result[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].id).toBe('subfolder-1')
  })

  it('drops an orphaned node whose parent_id points to a non-existent node', () => {
    const nodes = [
      {
        id: 'loc-1',
        parent_id: null,
        type: 'location',
        name: 'Main Street',
        address: null,
        description: null,
        sort_order: 0,
      },
      {
        id: 'orphan-1',
        parent_id: 'does-not-exist',
        type: 'folder',
        name: 'Orphan',
        address: null,
        description: null,
        sort_order: 0,
      },
    ]

    const result = buildTree(nodes, [])

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('loc-1')
    expect(result[0].children).toEqual([])

    function findInTree(treeNodes: typeof result, id: string): boolean {
      return treeNodes.some((n) => n.id === id || findInTree(n.children, id))
    }
    expect(findInTree(result, 'orphan-1')).toBe(false)
  })
})
