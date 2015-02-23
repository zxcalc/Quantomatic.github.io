open RG_SimpUtil


val simps = load_ruleset [
  "axioms/red_sp", "axioms/red_loop"
];


register_simproc ("red_sp", REDUCE_ALL simps);






