open RG_SimpUtil


val simps = load_ruleset [
  "axioms/red_copy", "axioms/red_pi_copy",
  "axioms/red_sp_angle", "axioms/green_sp_angle",
  "axioms/hopf", "axioms/red_scalar", "axioms/green_scalar", "axioms/green_id",
  "axioms/red_id", "axioms/red_loop", "axioms/green_loop", "aaa/green_H",
  "aaa/red_H"
];

val simproc = REDUCE_ALL simps;

register_simproc ("basic_simp", simproc);



