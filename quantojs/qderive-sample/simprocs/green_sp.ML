open RG_SimpUtil


val simps = load_ruleset [
  "axioms/green_sp", "axioms/green_loop"
];


register_simproc ("green_sp", REDUCE_ALL simps);






