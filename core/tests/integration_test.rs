use grid_puzzle_core::graph::GridGraph;
use grid_puzzle_core::validator::{validate, validate_partial};
use grid_puzzle_core::hint::get_hint;

#[test]
fn test_complete_puzzle_workflow() {
    // Generate a puzzle
    let graph = GridGraph::generate(0);
    
    // Verify the solution is valid
    let result = validate(&graph, &graph.solution_coords);
    assert!(result.is_solved, "Generated puzzle's solution should be valid");
    assert_eq!(result.correct_edge_count, result.total_edge_count);
    assert!(!result.has_extra_adjacencies);
    
    // Create a wrong placement
    let mut wrong_positions = graph.solution_coords.clone();
    wrong_positions[0] = (100, 100); // Move first vertex to wrong position
    
    // Validation should fail
    let result = validate(&graph, &wrong_positions);
    assert!(!result.is_solved, "Wrong placement should not be solved");
    
    // Get hint for the wrong vertex
    let positions_opt: Vec<Option<(i32, i32)>> = wrong_positions.iter().map(|&p| Some(p)).collect();
    let hint = get_hint(&graph, &positions_opt);
    assert!(hint.is_some(), "Should get hint for wrong vertex");
    
    let hint = hint.unwrap();
    assert_eq!(hint.vertex_id, 0, "Should hint the first (wrong) vertex");
    assert_eq!(hint.correct_position, graph.solution_coords[0]);
    
    // Apply the hint
    wrong_positions[hint.vertex_id] = hint.correct_position;
    
    // Now it should be solved
    let result = validate(&graph, &wrong_positions);
    assert!(result.is_solved, "After applying hint, puzzle should be solved");
}

#[test]
fn test_partial_placement_workflow() {
    let graph = GridGraph::generate(1); // Medium difficulty
    
    // Start with no placements
    let mut positions: Vec<Option<(i32, i32)>> = vec![None; graph.num_vertices];
    
    // Place vertices one by one correctly
    for i in 0..graph.num_vertices {
        positions[i] = Some(graph.solution_coords[i]);
        
        let result = validate_partial(&graph, &positions);
        
        if i < graph.num_vertices - 1 {
            // Not all placed yet
            assert!(!result.is_solved, "Should not be solved until all vertices placed");
        } else {
            // All placed correctly
            assert!(result.is_solved, "Should be solved when all vertices correctly placed");
        }
    }
}

#[test]
fn test_incremental_solving_with_hints() {
    let graph = GridGraph::generate(0);
    
    // Start with all wrong positions
    let mut positions: Vec<Option<(i32, i32)>> = vec![Some((100, 100)); graph.num_vertices];
    
    // Iteratively fix vertices using hints
    let mut iterations = 0;
    while let Some(hint) = get_hint(&graph, &positions) {
        positions[hint.vertex_id] = Some(hint.correct_position);
        iterations += 1;
        
        // Prevent infinite loop
        assert!(iterations <= graph.num_vertices, "Should not need more hints than vertices");
    }
    
    // Should be solved after applying all hints
    let all_positions: Vec<(i32, i32)> = positions.iter().map(|p| p.unwrap()).collect();
    let result = validate(&graph, &all_positions);
    assert!(result.is_solved, "Should be solved after applying all hints");
    assert_eq!(iterations, graph.num_vertices, "Should have fixed all vertices");
}

#[test]
fn test_multiple_puzzles_consistency() {
    // Generate multiple puzzles and verify they're all valid
    for difficulty in 0..=2 {
        for _ in 0..10 {
            let graph = GridGraph::generate(difficulty);
            
            // Each puzzle's solution should be valid
            let result = validate(&graph, &graph.solution_coords);
            assert!(
                result.is_solved,
                "All generated puzzles should have valid solutions (difficulty {})",
                difficulty
            );
            
            // Verify hint system works
            let mut positions: Vec<Option<(i32, i32)>> = graph.solution_coords.iter().map(|&p| Some(p)).collect();
            positions[0] = Some((999, 999)); // Make first vertex wrong
            
            let hint = get_hint(&graph, &positions);
            assert!(hint.is_some(), "Hint system should work for all puzzles");
            assert_eq!(hint.unwrap().vertex_id, 0);
        }
    }
}

#[test]
fn test_validation_detects_all_error_types() {
    let graph = GridGraph::generate(1);
    
    // Test 1: Duplicate positions
    let mut positions = graph.solution_coords.clone();
    positions[1] = positions[0]; // Duplicate
    let result = validate(&graph, &positions);
    assert!(!result.is_solved, "Should detect duplicate positions");
    
    // Test 2: Wrong distances
    positions = graph.solution_coords.clone();
    positions[0] = (positions[0].0 + 10, positions[0].1 + 10); // Far away
    let result = validate(&graph, &positions);
    assert!(!result.is_solved, "Should detect wrong edge distances");
    assert!(result.correct_edge_count < result.total_edge_count);
}

#[test]
fn test_edge_cases() {
    // Test with small graph
    let graph = GridGraph::generate(0);
    
    // Empty partial validation
    let empty_positions: Vec<Option<(i32, i32)>> = vec![None; graph.num_vertices];
    let result = validate_partial(&graph, &empty_positions);
    assert!(!result.is_solved);
    assert_eq!(result.correct_edge_count, 0);
    
    // Single vertex placed
    let mut single_positions = empty_positions.clone();
    single_positions[0] = Some(graph.solution_coords[0]);
    let result = validate_partial(&graph, &single_positions);
    assert!(!result.is_solved); // Can't be solved with just one vertex
}

#[test]
fn test_hint_exhaustion() {
    let graph = GridGraph::generate(0);
    
    // Start with correct solution
    let positions: Vec<Option<(i32, i32)>> = graph.solution_coords.iter().map(|&p| Some(p)).collect();
    
    // No hint should be available
    let hint = get_hint(&graph, &positions);
    assert!(hint.is_none(), "No hint should be available for correct solution");
}

#[test]
fn test_difficulty_scaling() {
    let mut easy_sizes = Vec::new();
    let mut medium_sizes = Vec::new();
    let mut hard_sizes = Vec::new();
    
    // Generate multiple puzzles
    for _ in 0..5 {
        easy_sizes.push(GridGraph::generate(0).num_vertices);
        medium_sizes.push(GridGraph::generate(1).num_vertices);
        hard_sizes.push(GridGraph::generate(2).num_vertices);
    }
    
    let avg_easy: f64 = easy_sizes.iter().sum::<usize>() as f64 / easy_sizes.len() as f64;
    let avg_medium: f64 = medium_sizes.iter().sum::<usize>() as f64 / medium_sizes.len() as f64;
    let avg_hard: f64 = hard_sizes.iter().sum::<usize>() as f64 / hard_sizes.len() as f64;
    
    // Verify difficulty progression
    assert!(
        avg_medium > avg_easy,
        "Medium should have more vertices than easy on average"
    );
    assert!(
        avg_hard > avg_medium,
        "Hard should have more vertices than medium on average"
    );
    
    // All puzzles should be solvable
    for difficulty in 0..=2 {
        let graph = GridGraph::generate(difficulty);
        let result = validate(&graph, &graph.solution_coords);
        assert!(result.is_solved);
    }
}

#[test]
fn test_validation_consistency() {
    // validate() and validate_partial() should agree when all vertices are placed
    let graph = GridGraph::generate(1);
    
    let positions = graph.solution_coords.clone();
    let positions_opt: Vec<Option<(i32, i32)>> = positions.iter().map(|&p| Some(p)).collect();
    
    let result_full = validate(&graph, &positions);
    let result_partial = validate_partial(&graph, &positions_opt);
    
    assert_eq!(result_full.is_solved, result_partial.is_solved);
    assert_eq!(result_full.correct_edge_count, result_partial.correct_edge_count);
    assert_eq!(result_full.total_edge_count, result_partial.total_edge_count);
    assert_eq!(result_full.has_extra_adjacencies, result_partial.has_extra_adjacencies);
}

#[test]
fn test_json_serialization_workflow() {
    use serde_json;
    
    // Generate a puzzle
    let graph = GridGraph::generate(0);
    
    // Serialize graph to JSON
    let graph_json = serde_json::to_string(&graph).expect("Should serialize graph");
    
    // Deserialize back
    let graph_restored: GridGraph = serde_json::from_str(&graph_json).expect("Should deserialize graph");
    
    // Verify it's the same
    assert_eq!(graph.num_vertices, graph_restored.num_vertices);
    assert_eq!(graph.edges, graph_restored.edges);
    assert_eq!(graph.solution_coords, graph_restored.solution_coords);
    
    // Validation should work on restored graph
    let result = validate(&graph_restored, &graph_restored.solution_coords);
    assert!(result.is_solved);
}
