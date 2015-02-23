open RG_SimpUtil


val simps = load_ruleset [
  "aaa/green_sp", "aaa/red_sp", "aaa/green_H", "aaa/red_H",
  "aaa/red_copy_phase", "aaa/HH", "aaa/green_id", "aaa/red_id"
];

val simproc = REDUCE_ALL simps;

register_simproc ("mbqc", simproc);




