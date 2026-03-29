export interface Point {
  x: number;
  y: number;
}

export interface PuzzleData {
  vertices: number[];
  edges: [number, number][];
}

export interface GraphInfo {
  num_vertices: number;
  num_edges: number;
  degrees: number[];
  grid_width: number;
  grid_height: number;
}

export interface ValidationResult {
  is_solved: boolean;
  edge_validity: boolean[];
  correct_edge_count: number;
  total_edge_count: number;
  has_extra_adjacencies: boolean;
}

export interface HintResult {
  vertex_id: number;
  correct_position: [number, number];
}

export type GridCoord = [number, number];

export type Positions = Record<number, GridCoord>;

export type AnimatingVertices = Record<number, GridCoord>;

export interface WasmModule {
  default: () => Promise<void>;
  generate_puzzle: (difficulty: number) => string;
  validate_placement: (positionsJson: string) => string;
  get_hint: (positionsJson: string) => string;
  get_solution: () => string;
  get_graph_info: () => string;
}
