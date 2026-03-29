use rand::prelude::*;
use rand::rngs::SmallRng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicU64, Ordering};

static SEED_COUNTER: AtomicU64 = AtomicU64::new(0x9E37_79B9_7F4A_7C15);

fn next_seed(difficulty: u32) -> u64 {
    let n = SEED_COUNTER.fetch_add(0x9E37_79B9_7F4A_7C15, Ordering::Relaxed);
    n ^ ((difficulty as u64) << 32) ^ 0xD1B5_4A32_D192_ED03
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GridGraph {
    pub num_vertices: usize,
    pub solution_coords: Vec<(i32, i32)>,
    pub edges: Vec<(usize, usize)>,
    pub adjacency: Vec<Vec<usize>>,
}

impl GridGraph {
    pub fn generate(difficulty: u32) -> Self {
        let mut rng = SmallRng::seed_from_u64(next_seed(difficulty));
        let (w_range, h_range, remove_range) = match difficulty {
            0 => ((3u32..=4), (3u32..=4), (2usize..=4)),
            1 => ((4u32..=6), (4u32..=6), (5usize..=10)),
            _ => ((5u32..=8), (5u32..=8), (10usize..=20)),
        };

        let width = rng.gen_range(w_range) as i32;
        let height = rng.gen_range(h_range) as i32;
        let remove_count = rng.gen_range(remove_range);

        let mut vertices: HashSet<(i32, i32)> = HashSet::new();
        for x in 0..width {
            for y in 0..height {
                vertices.insert((x, y));
            }
        }

        // Remove vertices while maintaining connectivity
        for _ in 0..remove_count {
            let candidates: Vec<(i32, i32)> = vertices
                .iter()
                .copied()
                .filter(|v| {
                    if vertices.len() <= 2 {
                        return false;
                    }
                    let mut temp = vertices.clone();
                    temp.remove(v);
                    is_connected(&temp)
                })
                .collect();

            if let Some(&v) = candidates.choose(&mut rng) {
                vertices.remove(&v);
            }
        }

        // Normalize coordinates so minimum is (0, 0)
        let min_x = vertices.iter().map(|v| v.0).min().unwrap_or(0);
        let min_y = vertices.iter().map(|v| v.1).min().unwrap_or(0);
        let vertices: HashSet<(i32, i32)> = vertices
            .into_iter()
            .map(|(x, y)| (x - min_x, y - min_y))
            .collect();

        // Convert to indexed representation
        let mut coord_list: Vec<(i32, i32)> = vertices.iter().copied().collect();
        coord_list.sort();

        let coord_to_idx: HashMap<(i32, i32), usize> = coord_list
            .iter()
            .enumerate()
            .map(|(i, &c)| (c, i))
            .collect();

        let num_vertices = coord_list.len();

        // Build edges (Manhattan distance == 1)
        let mut edges: Vec<(usize, usize)> = Vec::new();
        let mut adjacency: Vec<Vec<usize>> = vec![Vec::new(); num_vertices];

        for (i, &(x1, y1)) in coord_list.iter().enumerate() {
            for &(dx, dy) in &[(1, 0), (0, 1)] {
                let neighbor = (x1 + dx, y1 + dy);
                if let Some(&j) = coord_to_idx.get(&neighbor) {
                    edges.push((i, j));
                    adjacency[i].push(j);
                    adjacency[j].push(i);
                }
            }
        }

        // Shuffle vertex IDs
        let mut perm: Vec<usize> = (0..num_vertices).collect();
        perm.shuffle(&mut rng);
        let inv_perm: Vec<usize> = {
            let mut inv = vec![0; num_vertices];
            for (i, &p) in perm.iter().enumerate() {
                inv[p] = i;
            }
            inv
        };

        let shuffled_coords: Vec<(i32, i32)> = perm.iter().map(|&i| coord_list[i]).collect();
        let shuffled_edges: Vec<(usize, usize)> = edges
            .iter()
            .map(|&(u, v)| {
                let a = inv_perm[u];
                let b = inv_perm[v];
                (a.min(b), a.max(b))
            })
            .collect();

        let mut shuffled_adjacency: Vec<Vec<usize>> = vec![Vec::new(); num_vertices];
        for &(u, v) in &shuffled_edges {
            shuffled_adjacency[u].push(v);
            shuffled_adjacency[v].push(u);
        }

        GridGraph {
            num_vertices,
            solution_coords: shuffled_coords,
            edges: shuffled_edges,
            adjacency: shuffled_adjacency,
        }
    }
}

fn is_connected(vertices: &HashSet<(i32, i32)>) -> bool {
    if vertices.is_empty() {
        return true;
    }
    let start = *vertices.iter().next().unwrap();
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(start);
    visited.insert(start);

    while let Some(v) = queue.pop_front() {
        for &(dx, dy) in &[(1, 0), (-1, 0), (0, 1), (0, -1)] {
            let neighbor = (v.0 + dx, v.1 + dy);
            if vertices.contains(&neighbor) && !visited.contains(&neighbor) {
                visited.insert(neighbor);
                queue.push_back(neighbor);
            }
        }
    }

    visited.len() == vertices.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_generation_creates_valid_graph() {
        // Test all difficulty levels
        for difficulty in 0..=2 {
            let graph = GridGraph::generate(difficulty);
            
            // Check basic properties
            assert!(graph.num_vertices > 0, "Graph should have at least one vertex");
            assert_eq!(graph.solution_coords.len(), graph.num_vertices);
            assert_eq!(graph.adjacency.len(), graph.num_vertices);
            
            // All vertex IDs should be unique
            let coords_set: HashSet<_> = graph.solution_coords.iter().collect();
            assert_eq!(
                coords_set.len(),
                graph.num_vertices,
                "All solution coordinates should be unique"
            );
        }
    }

    #[test]
    fn test_graph_is_connected() {
        // Generate multiple graphs and verify connectivity
        for difficulty in 0..=2 {
            for _ in 0..5 {
                let graph = GridGraph::generate(difficulty);
                
                // Convert to HashSet for connectivity check
                let vertices: HashSet<(i32, i32)> = graph.solution_coords.iter().copied().collect();
                assert!(
                    is_connected(&vertices),
                    "Generated graph should be connected (difficulty {})",
                    difficulty
                );
            }
        }
    }

    #[test]
    fn test_edges_have_manhattan_distance_one() {
        for difficulty in 0..=2 {
            let graph = GridGraph::generate(difficulty);
            
            for &(u, v) in &graph.edges {
                let (x1, y1) = graph.solution_coords[u];
                let (x2, y2) = graph.solution_coords[v];
                let distance = (x1 - x2).abs() + (y1 - y2).abs();
                
                assert_eq!(
                    distance, 1,
                    "Edge ({}, {}) should have Manhattan distance 1, but has distance {}",
                    u, v, distance
                );
            }
        }
    }

    #[test]
    fn test_adjacency_list_matches_edges() {
        for difficulty in 0..=2 {
            let graph = GridGraph::generate(difficulty);
            
            // Count edges from adjacency list
            let mut edge_set = HashSet::new();
            for (u, neighbors) in graph.adjacency.iter().enumerate() {
                for &v in neighbors {
                    let edge = (u.min(v), u.max(v));
                    edge_set.insert(edge);
                }
            }
            
            // Compare with actual edges
            let actual_edges: HashSet<_> = graph.edges.iter().copied().collect();
            assert_eq!(
                edge_set, actual_edges,
                "Adjacency list should match edges list"
            );
        }
    }

    #[test]
    fn test_difficulty_affects_graph_size() {
        // Generate multiple graphs for each difficulty
        let mut easy_sizes = Vec::new();
        let mut medium_sizes = Vec::new();
        let mut hard_sizes = Vec::new();
        
        for _ in 0..10 {
            easy_sizes.push(GridGraph::generate(0).num_vertices);
            medium_sizes.push(GridGraph::generate(1).num_vertices);
            hard_sizes.push(GridGraph::generate(2).num_vertices);
        }
        
        let avg_easy = easy_sizes.iter().sum::<usize>() as f64 / easy_sizes.len() as f64;
        let avg_medium = medium_sizes.iter().sum::<usize>() as f64 / medium_sizes.len() as f64;
        let avg_hard = hard_sizes.iter().sum::<usize>() as f64 / hard_sizes.len() as f64;
        
        // Easy: 3x3 to 4x4 grid minus 2-4 vertices = ~5-14 vertices
        assert!(
            easy_sizes.iter().all(|&s| (5..=14).contains(&s)),
            "Easy graphs should have 5-14 vertices, got: {:?}",
            easy_sizes
        );
        
        // Medium: 4x4 to 6x6 grid minus 5-10 vertices = ~6-31 vertices
        assert!(
            medium_sizes.iter().all(|&s| (6..=31).contains(&s)),
            "Medium graphs should have 6-31 vertices, got: {:?}",
            medium_sizes
        );
        
        // Hard: 5x5 to 8x8 grid minus 10-20 vertices = ~5-54 vertices
        assert!(
            hard_sizes.iter().all(|&s| (5..=54).contains(&s)),
            "Hard graphs should have 5-54 vertices, got: {:?}",
            hard_sizes
        );
        
        // Average size should increase with difficulty
        assert!(
            avg_medium > avg_easy,
            "Medium difficulty should have more vertices on average than easy"
        );
        assert!(
            avg_hard > avg_medium,
            "Hard difficulty should have more vertices on average than medium"
        );
    }

    #[test]
    fn test_coordinates_normalized() {
        // Test that coordinates start from (0, 0) or have minimum coordinate 0
        for difficulty in 0..=2 {
            for _ in 0..5 {
                let graph = GridGraph::generate(difficulty);
                
                let min_x = graph.solution_coords.iter().map(|(x, _)| *x).min().unwrap();
                let min_y = graph.solution_coords.iter().map(|(_, y)| *y).min().unwrap();
                
                assert_eq!(
                    min_x, 0,
                    "Minimum x coordinate should be 0 after normalization"
                );
                assert_eq!(
                    min_y, 0,
                    "Minimum y coordinate should be 0 after normalization"
                );
            }
        }
    }

    #[test]
    fn test_is_connected_empty_graph() {
        let vertices = HashSet::new();
        assert!(is_connected(&vertices), "Empty graph should be considered connected");
    }

    #[test]
    fn test_is_connected_single_vertex() {
        let mut vertices = HashSet::new();
        vertices.insert((0, 0));
        assert!(is_connected(&vertices), "Single vertex should be connected");
    }

    #[test]
    fn test_is_connected_disconnected_graph() {
        let mut vertices = HashSet::new();
        vertices.insert((0, 0));
        vertices.insert((2, 2)); // Not adjacent to (0, 0)
        assert!(!is_connected(&vertices), "Disconnected vertices should not be connected");
    }

    #[test]
    fn test_is_connected_line_graph() {
        let mut vertices = HashSet::new();
        vertices.insert((0, 0));
        vertices.insert((1, 0));
        vertices.insert((2, 0));
        vertices.insert((3, 0));
        assert!(is_connected(&vertices), "Line graph should be connected");
    }
}
