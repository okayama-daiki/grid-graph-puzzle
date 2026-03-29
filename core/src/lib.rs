pub mod graph;
pub mod hint;
pub mod validator;

use graph::GridGraph;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

thread_local! {
    static CURRENT_GRAPH: RefCell<Option<GridGraph>> = const { RefCell::new(None) };
}

#[derive(Serialize)]
struct PuzzleData {
    vertices: Vec<usize>,
    edges: Vec<(usize, usize)>,
}

#[derive(Serialize)]
struct GraphInfo {
    num_vertices: usize,
    num_edges: usize,
    degrees: Vec<usize>,
    grid_width: i32,
    grid_height: i32,
}

#[derive(Serialize)]
struct HintResponse {
    vertex_id: usize,
    correct_position: (i32, i32),
}

#[wasm_bindgen]
pub fn generate_puzzle(difficulty: u32) -> String {
    let graph = GridGraph::generate(difficulty);
    let data = PuzzleData {
        vertices: (0..graph.num_vertices).collect(),
        edges: graph.edges.clone(),
    };
    let result = serde_json::to_string(&data).unwrap();
    CURRENT_GRAPH.with(|g| {
        *g.borrow_mut() = Some(graph);
    });
    result
}

#[wasm_bindgen]
pub fn validate_placement(positions_json: String) -> String {
    CURRENT_GRAPH.with(|g| {
        let g = g.borrow();
        let graph = g.as_ref().expect("No puzzle generated");

        let positions_map: HashMap<usize, Option<(i32, i32)>> =
            serde_json::from_str(&positions_json).unwrap();

        let mut positions: Vec<Option<(i32, i32)>> = vec![None; graph.num_vertices];
        for (&id, &pos) in &positions_map {
            if id < graph.num_vertices {
                positions[id] = pos;
            }
        }

        let result = validator::validate_partial(graph, &positions);
        serde_json::to_string(&result).unwrap()
    })
}

#[wasm_bindgen]
pub fn get_hint(positions_json: String) -> String {
    CURRENT_GRAPH.with(|g| {
        let g = g.borrow();
        let graph = g.as_ref().expect("No puzzle generated");

        let positions_map: HashMap<usize, Option<(i32, i32)>> =
            serde_json::from_str(&positions_json).unwrap();

        let mut positions: Vec<Option<(i32, i32)>> = vec![None; graph.num_vertices];
        for (&id, &pos) in &positions_map {
            if id < graph.num_vertices {
                positions[id] = pos;
            }
        }

        match hint::get_hint(graph, &positions) {
            Some(h) => serde_json::to_string(&HintResponse {
                vertex_id: h.vertex_id,
                correct_position: h.correct_position,
            })
            .unwrap(),
            None => "null".to_string(),
        }
    })
}

#[wasm_bindgen]
pub fn get_solution() -> String {
    CURRENT_GRAPH.with(|g| {
        let g = g.borrow();
        let graph = g.as_ref().expect("No puzzle generated");
        let solution: HashMap<usize, (i32, i32)> = graph
            .solution_coords
            .iter()
            .enumerate()
            .map(|(i, &c)| (i, c))
            .collect();
        serde_json::to_string(&solution).unwrap()
    })
}

#[wasm_bindgen]
pub fn get_graph_info() -> String {
    CURRENT_GRAPH.with(|g| {
        let g = g.borrow();
        let graph = g.as_ref().expect("No puzzle generated");

        let degrees: Vec<usize> = graph.adjacency.iter().map(|adj| adj.len()).collect();
        let max_x = graph.solution_coords.iter().map(|c| c.0).max().unwrap_or(0);
        let max_y = graph.solution_coords.iter().map(|c| c.1).max().unwrap_or(0);

        let info = GraphInfo {
            num_vertices: graph.num_vertices,
            num_edges: graph.edges.len(),
            degrees,
            grid_width: max_x + 1,
            grid_height: max_y + 1,
        };
        serde_json::to_string(&info).unwrap()
    })
}
