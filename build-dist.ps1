$base = "C:\Users\jeeva\.gemini\antigravity\scratch\passive-shelter-designer"
$html = [System.IO.File]::ReadAllText((Join-Path $base "index.html"), [System.Text.Encoding]::UTF8)
$css = [System.IO.File]::ReadAllText((Join-Path $base "css\style.css"), [System.Text.Encoding]::UTF8)

$mats = [System.IO.File]::ReadAllText((Join-Path $base "js\materials.js"), [System.Text.Encoding]::UTF8)
$clim = [System.IO.File]::ReadAllText((Join-Path $base "js\climate.js"), [System.Text.Encoding]::UTF8)
$eng = [System.IO.File]::ReadAllText((Join-Path $base "js\thermal-engine.js"), [System.Text.Encoding]::UTF8)
$v3d = [System.IO.File]::ReadAllText((Join-Path $base "js\viewer3d.js"), [System.Text.Encoding]::UTF8)
$chr = [System.IO.File]::ReadAllText((Join-Path $base "js\charts.js"), [System.Text.Encoding]::UTF8)
$cmp = [System.IO.File]::ReadAllText((Join-Path $base "js\comparison.js"), [System.Text.Encoding]::UTF8)
$app = [System.IO.File]::ReadAllText((Join-Path $base "js\app.js"), [System.Text.Encoding]::UTF8)

# Replace CSS link with inline style
$html = $html.Replace('<link rel="stylesheet" href="css/style.css">', "<style>`n$css`n</style>")

# Replace JS tags with inline script
$scriptsBlock = @"
<script src="js/materials.js"></script>
<script src="js/climate.js"></script>
<script src="js/thermal-engine.js"></script>
<script src="js/viewer3d.js"></script>
<script src="js/charts.js"></script>
<script src="js/comparison.js"></script>
<script src="js/app.js"></script>
"@

$combinedJs = "<script>`n$mats`n$clim`n$eng`n$v3d`n$chr`n$cmp`n$app`n</script>"
$html = $html.Replace($scriptsBlock, $combinedJs)

$deployDir = "C:\Users\jeeva\.gemini\antigravity\scratch\deploy-dist"
if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
New-Item -ItemType Directory -Path $deployDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $deployDir "index.html"), $html, [System.Text.Encoding]::UTF8)

$zipPath = "C:\Users\jeeva\.gemini\antigravity\scratch\deploy-dist.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $deployDir "index.html") -DestinationPath $zipPath -Force
Write-Host "Standalone bundle created at $zipPath"
