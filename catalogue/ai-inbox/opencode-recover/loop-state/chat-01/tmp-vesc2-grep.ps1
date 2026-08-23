$pc = "catalogue/ai-inbox/opencode-recover/pagecache"
function Show($pos, $pat, $n=6) {
  $t = Get-Content "$pc/$pos.txt" -Raw -ErrorAction SilentlyContinue
  if (-not $t) { "== pos $pos [$pat] == NO PAGECACHE"; return }
  $m = [regex]::Matches($t, "(?is).{0,70}$pat.{0,90}")
  "== pos $pos [$pat] =="
  $seen = @{}; $c = 0
  foreach ($x in $m) {
    $v = ($x.Value -replace "\s+", " ")
    $k = $v.Substring(0, [Math]::Min(60, $v.Length))
    if (-not $seen.ContainsKey($k)) {
      $seen[$k] = 1; $v; $c++
      if ($c -ge $n) { break }
    }
  }
  if ($c -eq 0) { "  (no match)" }
}
Show "3385" "M021MG"
Show "2746" "(MESON|59466|6500|Daylight)"
Show "2775" "(MESON|59467|4000|Cool white|Square)"
Show "3942" "(A27|BP1|12\.0|12V|Miniature|1-pack|1 pack)"
Show "3623" "(MK-WEL-12300|MK-W-12300|MASTER|P24|Checking your browser|challenge)"
Show "3343" "(EFM ?430|GOLD ELEPHANT|FLEXIBLE GRINDING)"
Show "3061" "(WHITE|Polycarbonate|SIRIM|Stainless)"
Show "816" "(White|Colour|Color)"
Show "393" "(Blue|Blue leather|Colour)"
Show "794" "(Green|Colour)"
Show "3861" "(Body ?Color|Body Colour|MS-PT13)"
Show "3985" "(Body ?Color|Body Colour|MS-PT06)"
foreach ($p in @("544","816","393","794")) { Show $p "(Glotool|GLOTOOL)" }
foreach ($p in @("544","816","393","794","3061","2770","4816","5387","2803","3861","3985","2746","2775","3343")) {
  Show $p "(uthori[sz]ed|istributor|sole agent|Sole Distributor|Authorised Dealer|official)"
}
