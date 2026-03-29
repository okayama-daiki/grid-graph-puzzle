use crate::graph::GridGraph;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_solved: bool,
    pub edge_validity: Vec<bool>,
    pub correct_edge_count: usize,
    pub total_edge_count: usize,
    pub has_extra_adjacencies: bool,
}

#[allow(dead_code)]
pub fn validate(graph: &GridGraph, positions: &[(i32, i32)]) -> ValidationResult {
    let total_edge_count = graph.edges.len();

    // Check all vertices placed at distinct positions
    let coords_set: HashSet<(i32, i32)> = positions.iter().copied().collect();
    if coords_set.len() != positions.len() {
        return ValidationResult {
            is_solved: false,
            edge_validity: vec![false; total_edge_count],
            correct_edge_count: 0,
            total_edge_count,
            has_extra_adjacencies: false,
        };
    }

    // Check each edge has Manhattan distance 1
    let edge_validity: Vec<bool> = graph
        .edges
        .iter()
        .map(|&(u, v)| manhattan_distance(positions[u], positions[v]) == 1)
        .collect();

    let correct_edge_count = edge_validity.iter().filter(|&&v| v).count();

    // Check no extra adjacencies (non-edge pairs at distance 1)
    let edge_set: HashSet<(usize, usize)> = graph
        .edges
        .iter()
        .flat_map(|&(u, v)| vec![(u, v), (v, u)])
        .collect();

    let mut has_extra = false;
    'outer: for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            if manhattan_distance(positions[i], positions[j]) == 1
                && !edge_set.contains(&(i, j))
            {
                has_extra = true;
                break 'outer;
            }
        }
    }

    let is_solved = correct_edge_count == total_edge_count && !has_extra;

    ValidationResult {
        is_solved,
        edge_validity,
        correct_edge_count,
        total_edge_count,
        has_extra_adjacencies: has_extra,
    }
}

pub fn validate_partial(
    graph: &GridGraph,
    positions: &[Option<(i32, i32)>],
) -> ValidationResult {
    let total_edge_count = graph.edges.len();

    // For partial validation, only check placed vertices
    let placed: Vec<(i32, i32)> = positions.iter().filter_map(|p| *p).collect();
    let coords_set: HashSet<(i32, i32)> = placed.iter().copied().collect();
    let has_duplicates = coords_set.len() != placed.len();

    let edge_validity: Vec<bool> = graph
        .edges
        .iter()
        .map(|&(u, v)| match (positions[u], positions[v]) {
            (Some(pu), Some(pv)) => manhattan_distance(pu, pv) == 1,
            _ => false,
        })
        .collect();

    let correct_edge_count = edge_validity.iter().filter(|&&v| v).count();

    // Check extra adjacencies among placed vertices
    let edge_set: HashSet<(usize, usize)> = graph
        .edges
        .iter()
        .flat_map(|&(u, v)| vec![(u, v), (v, u)])
        .collect();

    let mut has_extra = false;
    'outer: for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            if let (Some(pi), Some(pj)) = (positions[i], positions[j]) {
                if manhattan_distance(pi, pj) == 1 && !edge_set.contains(&(i, j)) {
                    has_extra = true;
                    break 'outer;
                }
            }
        }
    }

    let all_placed = positions.iter().all(|p| p.is_some());
    let is_solved =
        all_placed && !has_duplicates && correct_edge_count == total_edge_count && !has_extra;

    ValidationResult {
        is_solved,
        edge_validity,
        correct_edge_count,
        total_edge_count,
        has_extra_adjacencies: has_extra,
    }
}

fn manhattan_distance(a: (i32, i32), b: (i32, i32)) -> i32 {
    (a.0 - b.0).abs() + (a.1 - b.1).abs()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::GridGraph;

    fn create_simple_graph() -> GridGraph {
        // Create a simple 2x2 grid graph:
        //   0---1
        //   |   |
        //   2---3
        // Solution coordinates: 0:(0,0), 1:(1,0), 2:(0,1), 3:(1,1)
        GridGraph {
            num_vertices: 4,
            solution_coords: vec![(0, 0), (1, 0), (0, 1), (1, 1)],
            edges: vec![(0, 1), (0, 2), (1, 3), (2, 3)],
            adjacency: vec![vec![1, 2], vec![0, 3], vec![0, 3], vec![1, 2]],
        }
    }

    fn create_line_graph() -> GridGraph {
        // Create a line graph: 0---1---2
        // Solution coordinates: 0:(0,0), 1:(1,0), 2:(2,0)
        GridGraph {
            num_vertices: 3,
            solution_coords: vec![(0, 0), (1, 0), (2, 0)],
            edges: vec![(0, 1), (1, 2)],
            adjacency: vec![vec![1], vec![0, 2], vec![1]],
        }
    }

    #[test]
    fn test_validate_correct_embedding() {
        let graph = create_simple_graph();
        let positions = vec![(0, 0), (1, 0), (0, 1), (1, 1)];
        
        let result = validate(&graph, &positions);
        
        assert!(result.is_solved, "Correct embedding should be solved");
        assert_eq!(result.correct_edge_count, 4);
        assert_eq!(result.total_edge_count, 4);
        assert!(!result.has_extra_adjacencies);
        assert!(result.edge_validity.iter().all(|&v| v), "All edges should be valid");
    }

    #[test]
    fn test_validate_incorrect_embedding_wrong_distances() {
        let graph = create_simple_graph();
        // Place vertices too far apart
        let positions = vec![(0, 0), (2, 0), (0, 2), (2, 2)];
        
        let result = validate(&graph, &positions);
        
        assert!(!result.is_solved, "Incorrect distances should not be solved");
        assert_eq!(result.correct_edge_count, 0, "No edges should be correct");
        assert_eq!(result.total_edge_count, 4);
    }

    #[test]
    fn test_validate_duplicate_positions() {
        let graph = create_simple_graph();
        // Two vertices at the same position
        let positions = vec![(0, 0), (0, 0), (0, 1), (1, 1)];
        
        let result = validate(&graph, &positions);
        
        assert!(!result.is_solved, "Duplicate positions should not be solved");
        assert_eq!(result.correct_edge_count, 0);
    }

    #[test]
    fn test_validate_extra_adjacencies() {
        let graph = create_line_graph();
        // Arrange line graph in a triangle: 0-1 with 2 adjacent to both
        //   2
        //  / \
        // 0---1
        let positions = vec![(0, 0), (1, 0), (0, 1)];
        
        let result = validate(&graph, &positions);
        
        assert!(!result.is_solved, "Extra adjacencies should not be solved");
        assert!(result.has_extra_adjacencies, "Should detect extra adjacency between 0 and 2");
    }

    #[test]
    fn test_validate_partial_all_placed_correct() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((1, 0)),
            Some((0, 1)),
            Some((1, 1)),
        ];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(result.is_solved, "All placed correctly should be solved");
        assert_eq!(result.correct_edge_count, 4);
        assert!(!result.has_extra_adjacencies);
    }

    #[test]
    fn test_validate_partial_some_placed() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((1, 0)),
            None,
            None,
        ];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(!result.is_solved, "Partially placed should not be solved");
        assert_eq!(result.correct_edge_count, 1, "Only edge (0,1) should be correct");
        assert_eq!(result.total_edge_count, 4);
    }

    #[test]
    fn test_validate_partial_some_incorrect() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((2, 0)), // Too far from vertex 0
            Some((0, 1)),
            None,
        ];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(!result.is_solved);
        assert!(result.correct_edge_count < result.total_edge_count);
    }

    #[test]
    fn test_validate_partial_duplicates() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((0, 0)), // Duplicate!
            None,
            None,
        ];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(!result.is_solved, "Duplicates should not be solved");
    }

    #[test]
    fn test_validate_partial_extra_adjacencies() {
        let graph = create_line_graph();
        let positions = vec![
            Some((0, 0)),
            Some((1, 0)),
            Some((0, 1)), // Creates extra adjacency with vertex 0
        ];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(!result.is_solved);
        assert!(result.has_extra_adjacencies);
    }

    #[test]
    fn test_validate_partial_none_placed() {
        let graph = create_simple_graph();
        let positions = vec![None, None, None, None];
        
        let result = validate_partial(&graph, &positions);
        
        assert!(!result.is_solved);
        assert_eq!(result.correct_edge_count, 0);
        assert!(!result.has_extra_adjacencies);
    }

    #[test]
    fn test_manhattan_distance() {
        assert_eq!(manhattan_distance((0, 0), (0, 0)), 0);
        assert_eq!(manhattan_distance((0, 0), (1, 0)), 1);
        assert_eq!(manhattan_distance((0, 0), (0, 1)), 1);
        assert_eq!(manhattan_distance((0, 0), (1, 1)), 2);
        assert_eq!(manhattan_distance((0, 0), (2, 3)), 5);
        assert_eq!(manhattan_distance((3, 4), (1, 2)), 4);
    }

    #[test]
    fn test_edge_validity_array_size() {
        let graph = create_simple_graph();
        let positions = vec![(0, 0), (1, 0), (0, 1), (1, 1)];
        
        let result = validate(&graph, &positions);
        
        assert_eq!(
            result.edge_validity.len(),
            graph.edges.len(),
            "Edge validity array should match number of edges"
        );
    }

    #[test]
    fn test_validate_with_generated_graph() {
        // Test with a randomly generated graph
        let graph = GridGraph::generate(0); // Easy difficulty
        let positions = graph.solution_coords.clone();
        
        let result = validate(&graph, &positions);
        
        assert!(result.is_solved, "Generated graph's solution should validate as solved");
        assert_eq!(result.correct_edge_count, result.total_edge_count);
        assert!(!result.has_extra_adjacencies);
    }
}
