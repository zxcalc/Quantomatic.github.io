open RG_SimpUtil

val rotate = load_rule "theorems/rotate";
val green_ids = load_rule "axioms/green_ids";
val green_elim = load_rule "axioms/green_elim";

val simps = load_ruleset [
  "axioms/red_copy", "axioms/red_sp", "axioms/green_sp", "axioms/hopf",
  "axioms/red_scalar", "axioms/green_scalar", "axioms/green_id",
  "axioms/red_id", "axioms/red_loop", "axioms/green_loop"
];

val simproc = (
  REDUCE_ALL simps ++
  REDUCE_METRIC_TO 0 num_boundary_red green_ids ++
  LOOP (
    REDUCE_METRIC_TO 1 min_green_arity rotate ++
    REDUCE_WHILE (fn g => min_green_arity g = 1) green_elim
  ) ++
  REDUCE_ALL simps
);

register_simproc ("rotate_simp", simproc);











