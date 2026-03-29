use crate::graph::GridGraph;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HintResult {
    pub vertex_id: usize,
    pub correct_position: (i32, i32),
}

pub fn get_hint(
    graph: &GridGraph,
    positions: &[Option<(i32, i32)>],
) -> Option<HintResult> {
    // Find a vertex that is not in its correct position
    for (i, pos) in positions.iter().enumerate() {
        let correct = graph.solution_coords[i];
        match pos {
            None => {
                return Some(HintResult {
                    vertex_id: i,
                    correct_position: correct,
                });
            }
            Some(p) if *p != correct => {
                return Some(HintResult {
                    vertex_id: i,
                    correct_position: correct,
                });
            }
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::GridGraph;

    fn create_simple_graph() -> GridGraph {
        // Create a simple 2x2 grid graph
        // Solution: 0:(0,0), 1:(1,0), 2:(0,1), 3:(1,1)
        GridGraph {
            num_vertices: 4,
            solution_coords: vec![(0, 0), (1, 0), (0, 1), (1, 1)],
            edges: vec![(0, 1), (0, 2), (1, 3), (2, 3)],
            adjacency: vec![vec![1, 2], vec![0, 3], vec![0, 3], vec![1, 2]],
        }
    }

    #[test]
    fn test_hint_for_unplaced_vertex() {
        let graph = create_simple_graph();
        let positions = vec![Some((0, 0)), None, Some((0, 1)), Some((1, 1))];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some(), "Should return hint for unplaced vertex");
        let hint = hint.unwrap();
        assert_eq!(hint.vertex_id, 1, "Should hint vertex 1");
        assert_eq!(hint.correct_position, (1, 0), "Should provide correct position");
    }

    #[test]
    fn test_hint_for_misplaced_vertex() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((2, 0)), // Wrong position
            Some((0, 1)),
            Some((1, 1)),
        ];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some(), "Should return hint for misplaced vertex");
        let hint = hint.unwrap();
        assert_eq!(hint.vertex_id, 1, "Should hint vertex 1");
        assert_eq!(hint.correct_position, (1, 0), "Should provide correct position");
    }

    #[test]
    fn test_hint_returns_first_incorrect() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((2, 0)), // Wrong
            Some((3, 3)), // Also wrong
            Some((1, 1)),
        ];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some());
        let hint = hint.unwrap();
        // Should return the first misplaced vertex (vertex 1)
        assert_eq!(hint.vertex_id, 1);
        assert_eq!(hint.correct_position, (1, 0));
    }

    #[test]
    fn test_no_hint_when_all_correct() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)),
            Some((1, 0)),
            Some((0, 1)),
            Some((1, 1)),
        ];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_none(), "Should return None when all vertices are correct");
    }

    #[test]
    fn test_hint_prioritizes_none_over_misplaced() {
        let graph = create_simple_graph();
        let positions = vec![
            None, // Unplaced
            Some((2, 0)), // Misplaced
            Some((0, 1)),
            Some((1, 1)),
        ];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some());
        let hint = hint.unwrap();
        // Should return the first vertex (unplaced, vertex 0)
        assert_eq!(hint.vertex_id, 0);
        assert_eq!(hint.correct_position, (0, 0));
    }

    #[test]
    fn test_hint_with_all_none() {
        let graph = create_simple_graph();
        let positions = vec![None, None, None, None];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some(), "Should return hint even when nothing is placed");
        let hint = hint.unwrap();
        assert_eq!(hint.vertex_id, 0, "Should hint first vertex");
        assert_eq!(hint.correct_position, (0, 0));
    }

    #[test]
    fn test_hint_with_partially_correct() {
        let graph = create_simple_graph();
        let positions = vec![
            Some((0, 0)), // Correct
            Some((1, 0)), // Correct
            None,         // Not placed
            Some((2, 2)), // Wrong
        ];
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some());
        let hint = hint.unwrap();
        // Should hint vertex 2 (first incorrect one)
        assert_eq!(hint.vertex_id, 2);
        assert_eq!(hint.correct_position, (0, 1));
    }

    #[test]
    fn test_hint_with_generated_graph() {
        let graph = GridGraph::generate(0);
        
        // Create a partial placement with first vertex wrong
        let mut positions: Vec<Option<(i32, i32)>> = vec![None; graph.num_vertices];
        positions[0] = Some((100, 100)); // Definitely wrong
        
        let hint = get_hint(&graph, &positions);
        
        assert!(hint.is_some());
        let hint = hint.unwrap();
        assert_eq!(hint.vertex_id, 0);
        assert_eq!(hint.correct_position, graph.solution_coords[0]);
    }

    #[test]
    fn test_hint_correct_position_matches_solution() {
        let graph = create_simple_graph();
        
        // Test each vertex individually with all others correctly placed
        for vertex_id in 0..graph.num_vertices {
            let mut positions: Vec<Option<(i32, i32)>> = graph
                .solution_coords
                .iter()
                .map(|&coord| Some(coord))
                .collect();
            
            // Make only this vertex wrong
            positions[vertex_id] = Some((999, 999));
            
            let hint = get_hint(&graph, &positions);
            
            assert!(hint.is_some(), "Should get hint for vertex {}", vertex_id);
            let hint = hint.unwrap();
            assert_eq!(
                hint.vertex_id, vertex_id,
                "Should hint vertex {} when it's the only wrong one",
                vertex_id
            );
            assert_eq!(
                hint.correct_position,
                graph.solution_coords[vertex_id],
                "Hint should provide the correct solution coordinate for vertex {}",
                vertex_id
            );
        }
    }
}
